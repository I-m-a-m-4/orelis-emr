'use client';

/**
 * Orelis local IndexedDB mirror — the web and PWA counterpart to `sqlite.ts`.
 *
 * The packaged desktop and mobile apps mirror a clinic's working set into SQLite.
 * A browser has no SQLite, so the same job is done here, behind the same contract,
 * so that `mirror.ts` can hand either one to the rest of the app without callers
 * knowing which is underneath.
 *
 * ## Why a second store when Firestore already caches to IndexedDB
 *
 * `persistentLocalCache` (see `src/firebase/client-provider.tsx`) is the first line
 * of offline defence and handles the common case. It is not sufficient on its own
 * for the same reasons set out in `sqlite.ts`, and one more that is specific to the
 * browser: Firestore's cache is a single-tab-owner design. Open Orelis in a second
 * tab and the loser gets a cache it cannot write, and under storage pressure a
 * browser evicts origin data wholesale with no notice to the page. When that
 * happens the only thing standing between a clinician and an empty patient chart
 * is this database.
 *
 * ## The two contracts, unchanged from sqlite.ts
 *
 * 1. **An unreadable store is not an empty one.** Every read returns
 *    `{ ok, rows }`. A caller that cannot tell "this clinic has no encounters on
 *    file" from "the mirror could not be opened" renders an empty chart for a
 *    patient with ten years of history and sees no reason to re-fetch.
 *
 * 2. **Writes report whether they reached disk.** The caller stamps
 *    `sync_metadata` to say "this collection is cached", and that stamp carries a
 *    throttle. Stamping over a failed write is how a device ends up with zero
 *    records and a note saying the sync succeeded. This matters more here than in
 *    SQLite: a browser enforces a storage quota, so a write failing for lack of
 *    space is an ordinary Tuesday rather than a corruption event — and
 *    `QuotaExceededError` surfaces when the *transaction* aborts, not when the
 *    individual `put` resolves, which is why every write below awaits the
 *    transaction and not its requests.
 *
 * ## Why records are stored as JSON strings rather than live objects
 *
 * IndexedDB can hold a structured clone of an object directly, which would skip a
 * serialise/parse round-trip. It is deliberately not done, because the values here
 * come from Firestore and a `Timestamp` is a class instance: structured clone
 * preserves its fields but drops its prototype, so a `Timestamp` written on web
 * would come back as `{seconds, nanoseconds}` *without* `toDate()`, while SQLite —
 * which goes through `JSON.stringify` — has always returned the same shape. Any
 * component that called `.toDate()` would then work on desktop and throw on web.
 * Serialising identically on both backends costs a parse and buys the guarantee
 * that a record read from the mirror looks the same everywhere.
 */

import type { CachedResult, MirrorTable, QueuedAction } from './sqlite';

/**
 * Bumping this runs `onupgradeneeded`, which creates any store or index that is
 * missing. Adding a table or an index to the maps below therefore requires a bump,
 * or existing installs keep the old schema and the new index is silently absent —
 * turning an indexed read into a full scan rather than an error.
 */
const DB_VERSION = 1;
const DB_NAME = 'orelis-mirror';

/** Mirrors `ALL_TABLES` in sqlite.ts. The two must not drift. */
const ALL_TABLES: MirrorTable[] = [
  'clinics',
  'patients',
  'encounters',
  'appointments',
  'prescriptions',
  'medications',
  'lab_orders',
  'wards',
  'beds',
  'admissions',
  'invoices',
  'users',
  'audit_logs',
  'notifications',
];

/** Mirrors `CLINIC_SCOPED` in sqlite.ts. */
const CLINIC_SCOPED: MirrorTable[] = [
  'patients',
  'encounters',
  'appointments',
  'prescriptions',
  'medications',
  'lab_orders',
  'wards',
  'beds',
  'admissions',
  'invoices',
  'audit_logs',
];

/**
 * Tables whose records hang off a patient, matching the `json_extract` indexes in
 * sqlite.ts. `patientId` is lifted to a top-level column at write time because
 * IndexedDB cannot index into a serialised blob the way SQLite's
 * `json_extract` expression index can.
 */
const PATIENT_SCOPED: MirrorTable[] = [
  'encounters',
  'prescriptions',
  'lab_orders',
  'appointments',
  'admissions',
];

/** Mirrors `TIME_FIELD` in sqlite.ts — the field that supplies `created_at`. */
const TIME_FIELD: Partial<Record<MirrorTable, string>> = {
  encounters: 'date',
  appointments: 'appointmentDate',
  prescriptions: 'date',
  lab_orders: 'requestedAt',
  admissions: 'admittedAt',
  invoices: 'date',
  audit_logs: 'createdAt',
  notifications: 'timestamp',
  patients: 'registrationDate',
};

const META_STORE = 'sync_metadata';
const QUEUE_STORE = 'sync_queue';
const PROFILE_STORE = 'profiles';

/** One row as stored. `data` is the serialised record; the rest are index keys. */
interface MirrorRow {
  id: string;
  clinic_id: string;
  created_at: number;
  patient_id?: string;
  data: string;
}

/* ------------------------------------------------------------ promise adapters */

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * Resolve when the transaction commits, reject if it aborts.
 *
 * This is the only honest signal that a write reached disk. An individual `put`
 * reports success as soon as it is queued in the transaction; a quota overrun, a
 * constraint failure or a browser deciding to evict the origin all surface later
 * as an abort. Awaiting the requests alone would report every failed write as a
 * success — and then a stamp would be written over it.
 */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/* ------------------------------------------------------------------ open / init */

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Has the mirror been proven usable in this session?
 *
 * `null` = not yet determined, `true` = opened and upgraded, `false` = the open
 * failed. Matches `offlineDbUsable()` in sqlite.ts so the admin sync-health panel
 * can report either backend through one call.
 */
let dbUsable: boolean | null = null;

export function offlineIdbUsable(): boolean | null {
  return dbUsable;
}

/**
 * True when this platform has no IndexedDB at all, as opposed to having one that
 * failed to open.
 *
 * Server-side rendering is the ordinary case. Beyond that a browser can genuinely
 * lack a usable `indexedDB` — historically Safari in private mode, and any
 * embedded webview with site data disabled by policy — and for those the honest
 * answer to "did the write land" is the same as on a platform with no mirror at
 * all: there was nothing to write to, and Firestore's own cache is doing the job.
 */
function noMirrorExpected(): boolean {
  return typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB;
}

function applySchema(idb: IDBDatabase): void {
  for (const table of ALL_TABLES) {
    const store = idb.objectStoreNames.contains(table)
      ? // An upgrade transaction is the only place an existing store can be
        // reached for index changes, hence going through the request's own tx.
        (idb as any).transaction.objectStore(table)
      : idb.createObjectStore(table, { keyPath: 'id' });

    const ensureIndex = (name: string, keyPath: string | string[]) => {
      if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
    };

    if (CLINIC_SCOPED.includes(table)) {
      ensureIndex('by_clinic', 'clinic_id');
      // Composite so `limit` keeps the newest slice rather than an arbitrary one —
      // the equivalent of idx_<table>_clinic_time in the SQLite schema.
      ensureIndex('by_clinic_time', ['clinic_id', 'created_at']);
    }
    if (PATIENT_SCOPED.includes(table)) {
      ensureIndex('by_patient_time', ['patient_id', 'created_at']);
    }
    if (table === 'notifications') {
      ensureIndex('by_clinic', 'clinic_id');
      ensureIndex('by_clinic_time', ['clinic_id', 'created_at']);
    }
  }

  for (const name of [PROFILE_STORE, META_STORE, QUEUE_STORE]) {
    if (!db?.objectStoreNames.contains(name) && !idb.objectStoreNames.contains(name)) {
      idb.createObjectStore(name, { keyPath: 'id' });
    }
  }
}

export async function getOfflineIdb(): Promise<IDBDatabase | null> {
  if (db) return db;
  if (noMirrorExpected()) return null;
  if (initPromise) return initPromise;

  initPromise = new Promise<IDBDatabase | null>((resolve) => {
    let open: IDBOpenDBRequest;
    try {
      open = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Throwing synchronously is what a policy-blocked origin does.
      console.error('Failed to open IndexedDB mirror:', err);
      dbUsable = false;
      initPromise = null;
      resolve(null);
      return;
    }

    open.onupgradeneeded = () => {
      try {
        applySchema(open.result);
      } catch (err) {
        // Aborting the upgrade leaves the previous version intact rather than a
        // half-migrated one, which is the difference between a degraded cache and
        // a corrupt one.
        console.error('IndexedDB mirror upgrade failed:', err);
        open.transaction?.abort();
      }
    };

    open.onsuccess = () => {
      db = open.result;
      dbUsable = true;

      /**
       * Another tab opened a newer version and is waiting on this connection.
       * Close it — refusing would block that tab's upgrade indefinitely, and a
       * hospital workstation with Orelis open in three tabs is normal.
       */
      db.onversionchange = () => {
        db?.close();
        db = null;
        initPromise = null;
        dbUsable = null;
      };

      resolve(db);
    };

    open.onerror = () => {
      console.error('Failed to open IndexedDB mirror:', open.error);
      dbUsable = false;
      initPromise = null; // reset so a later attempt can retry
      resolve(null);
    };

    /**
     * Fired when another tab holds an open connection at the old version. Not
     * fatal and not resolved here: that tab's `onversionchange` closes it, this
     * request then proceeds and `onsuccess` fires.
     */
    open.onblocked = () => {
      console.warn(
        '[idb] mirror upgrade is blocked by another Orelis tab; waiting for it to close its connection.'
      );
    };
  });

  return initPromise;
}

/* --------------------------------------------------------------- serialisation */

/**
 * Seconds since the epoch for a record's time field.
 *
 * Deliberately identical to `timeSeconds` in sqlite.ts, including the reason it is
 * not a one-liner: the value arrives as a Firestore `Timestamp` from a server
 * read, a JS `Date` from a record written in this session, or an ISO string once it
 * has been through JSON. Reading `.seconds` alone silently falls back to "now" for
 * the other two, which stamps a backdated encounter with today's date in the
 * column used to order the patient's history.
 */
function timeSeconds(row: any, field?: string): number {
  if (!field) return 0;
  const raw = row?.[field];
  if (!raw) return 0;

  if (typeof raw.seconds === 'number') return raw.seconds;
  if (typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
  }

  const parsed = raw instanceof Date ? raw : new Date(raw);
  return isNaN(parsed.getTime()) ? 0 : Math.floor(parsed.getTime() / 1000);
}

function toRow(table: MirrorTable, clinicId: string, record: any): MirrorRow | null {
  if (!record?.id) return null;
  const row: MirrorRow = {
    id: String(record.id),
    clinic_id: clinicId,
    created_at: timeSeconds(record, TIME_FIELD[table]),
    data: JSON.stringify(record),
  };
  // Only set when present: an index skips records whose key path is undefined, so
  // a record with no patient stays out of the patient index rather than occupying
  // it under a bogus key.
  if (PATIENT_SCOPED.includes(table) && record.patientId) {
    row.patient_id = String(record.patientId);
  }
  return row;
}

function parseRows(rows: MirrorRow[]): any[] {
  const out: any[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.data));
    } catch {
      // One corrupt row must not lose the rest of the patient's history.
    }
  }
  return out;
}

/* ---------------------------------------------------------------------- writes */

/**
 * Mirror a collection. Returns whether the rows actually reached the store.
 *
 * `true` from a platform with no IndexedDB means "there is no mirror here", which
 * is not a failure. `false` always means "not stored" — and a caller that stamps
 * `sync_metadata` must withhold the stamp when it sees it.
 */
export async function syncRowsToOffline(
  table: MirrorTable,
  clinicId: string,
  records: any[]
): Promise<boolean> {
  const handle = await getOfflineIdb();
  if (!handle) return noMirrorExpected();
  if (!records?.length) return true;

  try {
    const tx = handle.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    for (const record of records) {
      const row = toRow(table, clinicId, record);
      if (row) store.put(row);
    }
    // The transaction, not the puts — see txDone().
    await txDone(tx);
    return true;
  } catch (err) {
    console.error(`IndexedDB sync error (${table}):`, err);
    return false;
  }
}

export async function syncRowToOffline(
  table: MirrorTable,
  clinicId: string,
  record: any
): Promise<boolean> {
  if (!record?.id) return false;
  return syncRowsToOffline(table, clinicId, [record]);
}

export async function deleteRowFromOffline(table: MirrorTable, id: string): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle || !id) return;
  try {
    const tx = handle.transaction(table, 'readwrite');
    tx.objectStore(table).delete(id);
    await txDone(tx);
  } catch (err) {
    console.error(`IndexedDB delete error (${table}):`, err);
  }
}

/* ----------------------------------------------------------------------- reads */

/**
 * Walk an index descending, newest first, stopping at `limit`.
 *
 * A cursor rather than `getAll`: `getAll` on an index returns ascending order with
 * no way to reverse it, so serving "the 50 most recent encounters" would mean
 * reading every encounter for the clinic and discarding all but the tail. On a
 * hospital's cache that is the difference between 50 records and 800.
 */
function collectDescending(
  source: IDBIndex,
  range: IDBKeyRange,
  limit?: number
): Promise<MirrorRow[]> {
  return new Promise<MirrorRow[]>((resolve, reject) => {
    const rows: MirrorRow[] = [];
    const cursorReq = source.openCursor(range, 'prev');
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return resolve(rows);
      rows.push(cursor.value as MirrorRow);
      if (limit && rows.length >= limit) return resolve(rows);
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error ?? new Error('cursor failed'));
  });
}

/**
 * Range covering every `created_at` for one key prefix.
 *
 * `-Infinity`/`Infinity` are valid IndexedDB number keys (only `NaN` is not) and
 * `created_at` is always finite, so this brackets the whole prefix without needing
 * to know the range of stored values.
 */
function prefixRange(prefix: string): IDBKeyRange {
  return IDBKeyRange.bound([prefix, -Infinity], [prefix, Infinity]);
}

/**
 * Read a mirrored collection, distinguishing an empty store from an unreadable
 * one. Every sync decision must be made from `ok`, never from `rows.length`.
 */
export async function getCachedRowsResult<T = any>(
  table: MirrorTable,
  clinicId: string,
  opts: { limit?: number; orderByTime?: boolean } = {}
): Promise<CachedResult<T>> {
  const handle = await getOfflineIdb();
  if (!handle) return { ok: noMirrorExpected(), rows: [] };

  const limit = opts.limit ? Math.max(1, Math.floor(opts.limit)) : undefined;

  try {
    const tx = handle.transaction(table, 'readonly');
    const store = tx.objectStore(table);

    // Unordered lookups (a ward, a bed, a medication) have no time index and do
    // not want one — matching `orderByTime: false` in the SQLite reader.
    if (opts.orderByTime === false || !store.indexNames.contains('by_clinic_time')) {
      const index = store.indexNames.contains('by_clinic') ? store.index('by_clinic') : null;
      const rows: MirrorRow[] = index
        ? await req(index.getAll(clinicId, limit))
        : (await req(store.getAll())).filter((r: MirrorRow) => r.clinic_id === clinicId);
      return { ok: true, rows: parseRows(rows) as T[] };
    }

    const rows = await collectDescending(store.index('by_clinic_time'), prefixRange(clinicId), limit);
    return { ok: true, rows: parseRows(rows) as T[] };
  } catch (err) {
    console.error(`IndexedDB retrieval error (${table}):`, err);
    return { ok: false, rows: [] };
  }
}

/**
 * Convenience read for callers that genuinely do not care why the list is empty
 * (a badge count, a "recent" strip). Never drive a re-sync from this.
 */
export async function getCachedRows<T = any>(
  table: MirrorTable,
  clinicId: string,
  opts: { limit?: number; orderByTime?: boolean } = {}
): Promise<T[]> {
  return (await getCachedRowsResult<T>(table, clinicId, opts)).rows;
}

/** Everything on one patient's chart, newest first. The most-opened screen. */
export async function getCachedRowsForPatient<T = any>(
  table: MirrorTable,
  patientId: string,
  opts: { limit?: number } = {}
): Promise<CachedResult<T>> {
  const handle = await getOfflineIdb();
  if (!handle || !patientId) return { ok: noMirrorExpected(), rows: [] };

  const limit = opts.limit ? Math.max(1, Math.floor(opts.limit)) : undefined;

  try {
    const tx = handle.transaction(table, 'readonly');
    const store = tx.objectStore(table);

    if (store.indexNames.contains('by_patient_time')) {
      const rows = await collectDescending(
        store.index('by_patient_time'),
        prefixRange(patientId),
        limit
      );
      return { ok: true, rows: parseRows(rows) as T[] };
    }

    /**
     * No patient index on this table. Rather than refuse, scan and filter: the
     * SQLite reader accepts any table here, and a caller that works on desktop and
     * throws on web is worse than a slow read. Only reachable for tables outside
     * PATIENT_SCOPED, which are small by construction.
     */
    const all: MirrorRow[] = await req(store.getAll());
    const filtered = all
      .filter((r) => {
        try {
          return JSON.parse(r.data)?.patientId === patientId;
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.created_at - a.created_at);
    return { ok: true, rows: parseRows(limit ? filtered.slice(0, limit) : filtered) as T[] };
  } catch (err) {
    console.error(`IndexedDB patient retrieval error (${table}):`, err);
    return { ok: false, rows: [] };
  }
}

/** A single record by id, across any mirrored table. */
export async function getCachedRow<T = any>(
  table: MirrorTable,
  id: string
): Promise<T | null> {
  const handle = await getOfflineIdb();
  if (!handle || !id) return null;
  try {
    const tx = handle.transaction(table, 'readonly');
    const row: MirrorRow | undefined = await req(tx.objectStore(table).get(id));
    return row ? (JSON.parse(row.data) as T) : null;
  } catch (err) {
    console.error(`IndexedDB row retrieval error (${table}):`, err);
    return null;
  }
}

/* ------------------------------------------------------------------- profiles */

/**
 * The signed-in user's profile, keyed by uid.
 *
 * This is the row that makes the whole cache reachable: every getter above is
 * keyed by clinicId, and offline that value can only come from the cached profile.
 * Keeping it in the database rather than localStorage is what stops a full cache
 * becoming unaddressable because a storage sweep evicted one small key.
 */
export async function syncProfileToOffline(profile: any): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle || !profile?.id) return;
  try {
    const tx = handle.transaction(PROFILE_STORE, 'readwrite');
    tx.objectStore(PROFILE_STORE).put({
      id: String(profile.id),
      data: JSON.stringify(profile),
      updated_at: Date.now(),
    });
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB sync error (profile):', err);
  }
}

export async function getCachedProfile<T = any>(userId: string): Promise<T | null> {
  const handle = await getOfflineIdb();
  if (!handle || !userId) return null;
  try {
    const tx = handle.transaction(PROFILE_STORE, 'readonly');
    const row = await req(tx.objectStore(PROFILE_STORE).get(userId));
    return row?.data ? (JSON.parse(row.data) as T) : null;
  } catch (err) {
    console.error('IndexedDB retrieval error (profile):', err);
    return null;
  }
}

/* -------------------------------------------------------------- sync_metadata */

/**
 * Stamp keys are shared with the SQLite backend on purpose.
 *
 * `setLastSyncMetadata` in both backends also writes localStorage, and the two
 * must agree on the key or a device that switched backends — a browser install
 * later opened in the packaged app on the same profile is not possible, but a
 * shared `localStorage` between the PWA and the site is — would read one backend's
 * stamp while holding the other's data.
 */
function metadataKey(clinicId: string, type: string): string {
  return `orelis_sync_metadata_${clinicId}_${type}`;
}

export async function setLastSyncMetadata(
  clinicId: string,
  type: string,
  timestamp: number
): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(metadataKey(clinicId, type), String(timestamp));
    } catch {
      /* quota — the IndexedDB copy below is the authoritative one */
    }
  }

  const handle = await getOfflineIdb();
  if (!handle) return;
  try {
    const tx = handle.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({
      id: `${clinicId}_${type}`,
      clinic_id: clinicId,
      last_sync_timestamp: timestamp,
    });
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB metadata sync error:', err);
  }
}

export async function getLastSyncMetadata(clinicId: string, type: string): Promise<number> {
  const handle = await getOfflineIdb();
  if (handle) {
    try {
      const tx = handle.transaction(META_STORE, 'readonly');
      const row = await req(tx.objectStore(META_STORE).get(`${clinicId}_${type}`));
      if (row?.last_sync_timestamp) return Number(row.last_sync_timestamp);
    } catch {
      /* fall through to localStorage */
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(metadataKey(clinicId, type));
      if (local) return Number(local);
    } catch {
      /* unavailable */
    }
  }

  return 0;
}

/**
 * Does a stamp claim a collection is cached while the mirror holds nothing?
 *
 * The stamp lives in two places (localStorage and IndexedDB) and the data it
 * certifies lives only in IndexedDB. Nothing keeps those in step, so an origin
 * whose storage was evicted gets a fresh stamp over an empty store and — because
 * the stamp carries a throttle — refuses to re-fetch. Browser eviction makes this
 * materially more likely here than on SQLite: a quota sweep takes the records and
 * leaves localStorage alone.
 */
export async function cacheContradictsStamp(
  table: MirrorTable,
  clinicId: string,
  type: string
): Promise<boolean> {
  const stamp = await getLastSyncMetadata(clinicId, type);
  if (!stamp) return false;

  const { ok, rows } = await getCachedRowsResult(table, clinicId, { limit: 1 });
  // An unreadable store is a contradiction too: the stamp cannot be trusted about
  // a mirror we could not even open.
  return !ok || rows.length === 0;
}

/* ---------------------------------------------------------------- sync_queue */

export async function saveActionToOfflineQueue(action: QueuedAction): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle) return;
  try {
    const tx = handle.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put({
      id: action.id,
      action_type: action.type,
      payload: JSON.stringify(action.payload ?? null),
      description: action.description ?? '',
      timestamp: action.timestamp,
      attempts: action.attempts ?? 0,
      last_error: action.lastError ?? null,
      status: action.status ?? 'pending',
    });
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB queue save error:', err);
  }
}

export async function getOfflineQueue(): Promise<QueuedAction[]> {
  const handle = await getOfflineIdb();
  if (!handle) return [];
  try {
    const tx = handle.transaction(QUEUE_STORE, 'readonly');
    const rows: any[] = await req(tx.objectStore(QUEUE_STORE).getAll());
    return rows
      .filter((r) => r.status !== 'synced')
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map((r) => ({
        id: r.id,
        type: r.action_type,
        payload: (() => {
          try {
            return JSON.parse(r.payload);
          } catch {
            return null;
          }
        })(),
        description: r.description,
        timestamp: Number(r.timestamp),
        attempts: Number(r.attempts ?? 0),
        lastError: r.last_error ?? null,
        status: r.status,
      }));
  } catch (err) {
    console.error('IndexedDB queue retrieval error:', err);
    return [];
  }
}

export async function removeActionFromOfflineQueue(actionId: string): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle) return;
  try {
    const tx = handle.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(actionId);
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB queue delete error:', err);
  }
}

/**
 * Record a failed drain attempt so a poison action cannot spin forever.
 *
 * Read-modify-write inside one transaction. IndexedDB has no `UPDATE ... SET
 * attempts = attempts + 1`, and doing the read in a separate transaction would let
 * two concurrent drains both read 3 and both write 4, so an action that should be
 * abandoned after N tries never reaches N.
 */
export async function markQueueAttempt(actionId: string, error: string): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle) return;
  try {
    const tx = handle.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const row = await req(store.get(actionId));
    if (row) {
      row.attempts = Number(row.attempts ?? 0) + 1;
      row.last_error = error.slice(0, 500);
      store.put(row);
    }
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB queue attempt error:', err);
  }
}

export async function getOfflineQueueDepth(): Promise<number> {
  const handle = await getOfflineIdb();
  if (!handle) return 0;
  try {
    const tx = handle.transaction(QUEUE_STORE, 'readonly');
    const rows: any[] = await req(tx.objectStore(QUEUE_STORE).getAll());
    return rows.filter((r) => r.status !== 'synced').length;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ teardown */

/**
 * Wipe every mirrored store. Used on sign-out and on a clinic switch.
 *
 * `sync_metadata` goes with it deliberately: leaving stamps behind after the data
 * they certify has been deleted recreates exactly the stamp-outlives-its-data
 * problem `cacheContradictsStamp` exists to catch.
 *
 * One transaction over every store, so a failure partway leaves nothing deleted
 * rather than a cache half belonging to the previous tenant — the case
 * `claimCacheForClinic` calls a breach.
 */
export async function clearAllTables(): Promise<void> {
  const handle = await getOfflineIdb();
  if (!handle) return;
  const names = [...ALL_TABLES, PROFILE_STORE, META_STORE, QUEUE_STORE].filter((n) =>
    handle.objectStoreNames.contains(n)
  );
  if (!names.length) return;
  try {
    const tx = handle.transaction(names, 'readwrite');
    for (const name of names) tx.objectStore(name).clear();
    await txDone(tx);
  } catch (err) {
    console.error('IndexedDB clear error:', err);
  }
}
