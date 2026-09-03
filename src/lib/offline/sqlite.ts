'use client';

import Database from '@tauri-apps/plugin-sql';
import { writtenSince } from './watermark';

/**
 * Orelis local SQLite mirror.
 *
 * Firestore's own `persistentLocalCache` (see `src/firebase/client-provider.tsx`)
 * is the first line of offline defence and handles the common case. This file is
 * the *durable* second store beneath it, and it exists because in a packaged
 * webview the IndexedDB that Firestore's cache lives in can be evicted, wiped by
 * a WebView update, or locked by a second process — and when that happens the
 * only thing standing between a clinician and an empty patient chart is this
 * database.
 *
 * Two contracts here were learned the expensive way in the Zeneva codebase this
 * pattern comes from, and both are load-bearing:
 *
 * 1. **An unreadable store is not an empty one.** Every read returns
 *    `{ ok, rows }`. A caller that cannot tell "this clinic has no encounters on
 *    file" from "the mirror could not be opened" will render an empty chart for a
 *    patient with ten years of history, and — worse — will see no reason to
 *    re-fetch. `getCachedRows` exists for the callers that genuinely do not care,
 *    and no sync decision may be made from it.
 *
 * 2. **Writes report whether they reached disk.** `syncRowsToOffline` returns
 *    `boolean` rather than swallowing its error, because the caller stamps
 *    `sync_metadata` to say "this collection is cached" and that stamp carries a
 *    throttle. Stamping over a failed write is how a device ends up with zero
 *    records and a note saying the sync succeeded.
 */

/** Every mirrored collection. Table names double as the Firestore collection. */
export type MirrorTable =
  | 'clinics'
  | 'patients'
  | 'encounters'
  | 'appointments'
  | 'prescriptions'
  | 'medications'
  | 'lab_orders'
  | 'wards'
  | 'beds'
  | 'admissions'
  | 'invoices'
  | 'users'
  | 'audit_logs'
  | 'notifications';

/**
 * Which JSON field carries each table's ordering time, mirrored into the
 * `created_at` INTEGER column.
 *
 * Kept out of the JSON blob so `ORDER BY created_at DESC LIMIT n` can be served
 * from an index instead of parsing every row. Tables absent from this map are
 * unordered lookups (a ward, a bed, a medication) and get 0.
 */
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

/**
 * Tables scoped to a single clinic. `clinics` and `users` are deliberately not
 * here — a user's own profile must be readable before we know which clinic they
 * belong to, which is the value every other query is keyed by.
 */
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

let db: Database | null = null;
let initPromise: Promise<Database | null> | null = null;

/**
 * Has the local store ever been proven usable in this session?
 *
 * `null` = not yet determined, `true` = a handle was obtained and the schema
 * applied, `false` = `Database.load` or the migration pass failed. Callers use
 * this to decide whether to keep a second store alive rather than trusting one
 * that has already failed.
 */
let dbUsable: boolean | null = null;

/** What the last `getOfflineDb()` attempt proved about the local store. */
export function offlineDbUsable(): boolean | null {
  return dbUsable;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    id TEXT PRIMARY KEY,
    clinic_id TEXT,
    last_sync_timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    action_type TEXT,
    payload TEXT,
    description TEXT,
    timestamp INTEGER,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  ${ALL_TABLES.map(
    (t) => `
  CREATE TABLE IF NOT EXISTS ${t} (
    id TEXT PRIMARY KEY,
    clinic_id TEXT,
    data TEXT,
    created_at INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`
  ).join('')}

  ${CLINIC_SCOPED.map(
    (t) => `
  CREATE INDEX IF NOT EXISTS idx_${t}_clinic ON ${t} (clinic_id);
  CREATE INDEX IF NOT EXISTS idx_${t}_clinic_time ON ${t} (clinic_id, created_at DESC);`
  ).join('')}

  -- Chart lookups: every clinical record hangs off a patient, and the patient
  -- chart is the single most-opened screen in the app.
  CREATE INDEX IF NOT EXISTS idx_encounters_patient
    ON encounters (json_extract(data, '$.patientId'));
  CREATE INDEX IF NOT EXISTS idx_prescriptions_patient
    ON prescriptions (json_extract(data, '$.patientId'));
  CREATE INDEX IF NOT EXISTS idx_lab_orders_patient
    ON lab_orders (json_extract(data, '$.patientId'));
  CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON appointments (json_extract(data, '$.patientId'));
  CREATE INDEX IF NOT EXISTS idx_admissions_patient
    ON admissions (json_extract(data, '$.patientId'));
  CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (json_extract(data, '$.userId'));
`;

export async function getOfflineDb(): Promise<Database | null> {
  if (db) return db;
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return null;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const loaded = await Database.load('sqlite:orelis.db');
      await loaded.execute(SCHEMA);
      db = loaded;
      dbUsable = true;
      return db;
    } catch (err) {
      console.error('Failed to initialize SQLite offline DB:', err);
      dbUsable = false;
      initPromise = null; // reset so a later attempt can retry
      return null;
    }
  })();

  return initPromise;
}

/**
 * True when this platform has no SQLite mirror at all (the browser), as opposed
 * to having one that failed to open.
 *
 * The distinction is the whole point of the `{ ok }` flag: on web, "no mirror" is
 * normal and `ok: true` is the honest answer, because Firestore's own cache is
 * doing the job. Inside a Tauri shell it means something broke.
 */
function noMirrorExpected(): boolean {
  return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;
}

/**
 * Seconds since the epoch for a record's time field.
 *
 * The value arrives in three shapes and only one of them has `.seconds`: a
 * Firestore Timestamp from a server read, a JS `Date` from a record just written
 * in this session, and an ISO string once it has been through JSON (anything
 * that round-tripped through the offline queue or this very cache). Reading
 * `.seconds` alone silently falls back to "now" for the other two — which stamps
 * a backdated encounter and an offline one with today's date, in the column used
 * for ordering the patient's history.
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

/**
 * Upserts many rows in as few round-trips as possible.
 *
 * The SQL plugin exposes no `batch` command — only `execute` — so a
 * row-at-a-time loop costs one IPC hop per row, which is thousands of hops for a
 * real patient list and leaves partial data behind if it is interrupted. One
 * multi-row INSERT per chunk is a single hop and a single atomic statement.
 *
 * Chunks stay under SQLite's 999 bound-variable ceiling; exceeding it fails the
 * whole statement with "too many SQL variables".
 */
const MAX_BIND_VARIABLES = 900;

async function upsertRows(
  handle: Database,
  table: string,
  columns: string[],
  rows: any[][]
): Promise<void> {
  if (rows.length === 0) return;

  const rowsPerChunk = Math.max(1, Math.floor(MAX_BIND_VARIABLES / columns.length));
  const columnList = columns.join(', ');

  for (let offset = 0; offset < rows.length; offset += rowsPerChunk) {
    const chunk = rows.slice(offset, offset + rowsPerChunk);
    const placeholders: string[] = [];
    const binds: any[] = [];

    chunk.forEach((row, rowIndex) => {
      const base = rowIndex * columns.length;
      placeholders.push(`(${columns.map((_, i) => `$${base + i + 1}`).join(', ')})`);
      binds.push(...row);
    });

    // updated_at is omitted so its DEFAULT CURRENT_TIMESTAMP applies per row.
    await handle.execute(
      `INSERT OR REPLACE INTO ${table} (${columnList}) VALUES ${placeholders.join(', ')}`,
      binds
    );
  }
}

/**
 * Mirror a collection to disk. Returns whether the rows actually got there.
 *
 * `true` from a non-Tauri caller means "there is no SQLite mirror on this
 * platform", which is not a failure. `false` always means "not on disk" — and a
 * caller that stamps `sync_metadata` must withhold the stamp when it sees it.
 */
export async function syncRowsToOffline(
  table: MirrorTable,
  clinicId: string,
  rows: any[]
): Promise<boolean> {
  const handle = await getOfflineDb();
  if (!handle) return noMirrorExpected();
  if (!rows?.length) return true;

  const field = TIME_FIELD[table];
  try {
    const values = rows
      .filter((r) => r?.id)
      .map((r) => [r.id, clinicId, JSON.stringify(r), timeSeconds(r, field)]);
    await upsertRows(handle, table, ['id', 'clinic_id', 'data', 'created_at'], values);
    return true;
  } catch (err) {
    console.error(`SQLite sync error (${table}):`, err);
    return false;
  }
}

/** Mirror a single record — the write path after a create or an edit. */
export async function syncRowToOffline(
  table: MirrorTable,
  clinicId: string,
  row: any
): Promise<boolean> {
  if (!row?.id) return false;
  return syncRowsToOffline(table, clinicId, [row]);
}

export async function deleteRowFromOffline(table: MirrorTable, id: string): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    await handle.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
  } catch (err) {
    console.error(`SQLite delete error (${table}):`, err);
  }
}

/**
 * Drop every mirrored row for one clinic whose id is not in `serverIds`.
 *
 * This is the tombstone half of sync, and without it deletes do not stick.
 * `syncRowsToOffline` only ever upserts, so a record removed on the server — or
 * by another device — stays in this mirror indefinitely and is handed straight
 * back to the UI by the next offline read. The symptom is precise: the record
 * vanishes when it is deleted (the live Firestore listener drops it) and is back
 * after the next cold start, which reads the mirror.
 *
 * ## Only ever call this with the ids of a *complete* fetch
 *
 * Every sync target carries a `limit`. If a fetch filled its page, "not in
 * `serverIds`" also describes every record beyond that limit — a clinic's older
 * history, which is perfectly valid and simply was not requested — and
 * reconciling against it would delete exactly the data this subsystem exists to
 * keep. `syncOneTarget` in ./sync.ts is responsible for that call and skips
 * reconciliation for any collection whose page came back full.
 *
 * ## `protectNewerThan` guards writes the server has not seen yet
 *
 * `persistRecord` mirrors a new record immediately and lets the Firestore write
 * settle in its own time. So there is a window where a row is legitimately in the
 * mirror and legitimately absent from the server — and reconciling in that window
 * would delete a record the user typed seconds ago, which is the precise failure
 * this whole subsystem exists to prevent. Any row whose own `updatedAt` (or
 * `createdAt`) is at or after this watermark is therefore kept regardless of the
 * server's answer. Callers pass the instant the fetch began, less a margin.
 */
export async function reconcileMirror(
  table: MirrorTable,
  clinicId: string,
  serverIds: string[],
  opts: { protectNewerThan?: number } = {}
): Promise<number> {
  const handle = await getOfflineDb();
  if (!handle || !clinicId) return 0;

  try {
    const existing: any[] = await handle.select(
      `SELECT id, data FROM ${table} WHERE clinic_id = $1`,
      [clinicId]
    );

    const keep = new Set(serverIds.map(String));
    const watermark = opts.protectNewerThan;

    const stale = existing
      .filter((row) => {
        if (keep.has(String(row.id))) return false;
        if (watermark === undefined) return true;
        return !writtenSince(row.data, watermark);
      })
      .map((row) => String(row.id));

    if (!stale.length) return 0;

    // Chunked for the same reason upsertRows is: one DELETE per stale id would
    // be hundreds of round trips, and one with hundreds of binds exceeds the
    // driver's variable ceiling.
    for (let offset = 0; offset < stale.length; offset += MAX_BIND_VARIABLES) {
      const chunk = stale.slice(offset, offset + MAX_BIND_VARIABLES);
      const placeholders = chunk.map((_, i) => `$${i + 1}`).join(', ');
      await handle.execute(`DELETE FROM ${table} WHERE id IN (${placeholders})`, chunk);
    }

    return stale.length;
  } catch (err) {
    console.error(`SQLite reconcile error (${table}):`, err);
    return 0;
  }
}

/**
 * Purge one patient's rows from a mirrored collection.
 *
 * `/api/admin/cascade-delete` removes a patient's appointments, encounters,
 * invoices, prescriptions, labs and admissions server-side, but it runs under
 * `firebase-admin` on the server and cannot reach this device's mirror. Without
 * this, a deleted patient's entire chart stays readable offline — and reachable
 * by `getCachedRow('patients', id)`, which is how `encounters.ts` resolves a
 * patient name.
 */
export async function deleteRowsForPatient(
  table: MirrorTable,
  patientId: string
): Promise<number> {
  const handle = await getOfflineDb();
  if (!handle || !patientId) return 0;
  try {
    const result: any = await handle.execute(
      `DELETE FROM ${table} WHERE json_extract(data, '$.patientId') = $1`,
      [patientId]
    );
    return Number(result?.rowsAffected ?? 0);
  } catch (err) {
    console.error(`SQLite patient purge error (${table}):`, err);
    return 0;
  }
}

export interface CachedResult<T = any> {
  /** False only when the store could not be read — never for an empty table. */
  ok: boolean;
  rows: T[];
}

function parseRows(result: any[]): any[] {
  const rows: any[] = [];
  for (const r of result) {
    try {
      rows.push(JSON.parse(r.data));
    } catch {
      // One corrupt row must not lose the rest of the patient's history.
    }
  }
  return rows;
}

/**
 * Read a mirrored collection, distinguishing an empty table from an unreadable
 * store. Every sync decision must be made from `ok`, never from `rows.length`.
 */
export async function getCachedRowsResult<T = any>(
  table: MirrorTable,
  clinicId: string,
  opts: { limit?: number; orderByTime?: boolean } = {}
): Promise<CachedResult<T>> {
  const handle = await getOfflineDb();
  if (!handle) return { ok: noMirrorExpected(), rows: [] };

  const order = opts.orderByTime === false ? '' : ' ORDER BY created_at DESC';
  const limit = opts.limit ? ` LIMIT ${Math.max(1, Math.floor(opts.limit))}` : '';

  try {
    const result: any[] = await handle.select(
      `SELECT data FROM ${table} WHERE clinic_id = $1${order}${limit}`,
      [clinicId]
    );
    return { ok: true, rows: parseRows(result) as T[] };
  } catch (err) {
    console.error(`SQLite retrieval error (${table}):`, err);
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
  const handle = await getOfflineDb();
  if (!handle) return { ok: noMirrorExpected(), rows: [] };

  const limit = opts.limit ? ` LIMIT ${Math.max(1, Math.floor(opts.limit))}` : '';
  try {
    const result: any[] = await handle.select(
      `SELECT data FROM ${table}
        WHERE json_extract(data, '$.patientId') = $1
        ORDER BY created_at DESC${limit}`,
      [patientId]
    );
    return { ok: true, rows: parseRows(result) as T[] };
  } catch (err) {
    console.error(`SQLite patient retrieval error (${table}):`, err);
    return { ok: false, rows: [] };
  }
}

/** A single record by id, across any mirrored table. */
export async function getCachedRow<T = any>(
  table: MirrorTable,
  id: string
): Promise<T | null> {
  const handle = await getOfflineDb();
  if (!handle || !id) return null;
  try {
    const result: any[] = await handle.select(
      `SELECT data FROM ${table} WHERE id = $1`,
      [id]
    );
    return result.length ? (JSON.parse(result[0].data) as T) : null;
  } catch (err) {
    console.error(`SQLite row retrieval error (${table}):`, err);
    return null;
  }
}

/* ------------------------------------------------------------------ profiles */

/**
 * The signed-in user's profile, keyed by uid.
 *
 * This is the row that makes the whole cache reachable: every getter above is
 * keyed by clinicId, and offline that value can only come from the cached
 * profile. Keeping it in its own unscoped table — rather than in localStorage
 * alongside everything else — is what stops a full database becoming
 * unaddressable because a storage quota evicted one small key.
 */
export async function syncProfileToOffline(profile: any): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle || !profile?.id) return;
  try {
    await handle.execute(
      'INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [profile.id, JSON.stringify(profile)]
    );
  } catch (err) {
    console.error('SQLite sync error (profile):', err);
  }
}

export async function getCachedProfile<T = any>(userId: string): Promise<T | null> {
  const handle = await getOfflineDb();
  if (!handle || !userId) return null;
  try {
    const result: any[] = await handle.select(
      'SELECT data FROM profiles WHERE id = $1',
      [userId]
    );
    return result.length ? (JSON.parse(result[0].data) as T) : null;
  } catch (err) {
    console.error('SQLite retrieval error (profile):', err);
    return null;
  }
}

/* ------------------------------------------------------------ sync_metadata */

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
      /* quota — the SQLite copy below is the authoritative one */
    }
  }

  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    await handle.execute(
      'INSERT OR REPLACE INTO sync_metadata (id, clinic_id, last_sync_timestamp) VALUES ($1, $2, $3)',
      [`${clinicId}_${type}`, clinicId, timestamp]
    );
  } catch (err) {
    console.error('SQLite metadata sync error:', err);
  }
}

export async function getLastSyncMetadata(
  clinicId: string,
  type: string
): Promise<number> {
  const handle = await getOfflineDb();
  if (handle) {
    try {
      const result: any[] = await handle.select(
        'SELECT last_sync_timestamp FROM sync_metadata WHERE id = $1',
        [`${clinicId}_${type}`]
      );
      if (result.length && result[0].last_sync_timestamp) {
        return Number(result[0].last_sync_timestamp);
      }
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
 * The stamp lives in two places (localStorage and SQLite) and the data it
 * certifies lives only in SQLite. Nothing keeps those in step, so a device whose
 * database was locked, corrupt or recreated gets a fresh stamp over an empty
 * table and — because the stamp carries a throttle — refuses to re-fetch for a
 * day. This is the reconciliation that breaks that deadlock; callers force one
 * re-sync per session when it returns true.
 */
export async function cacheContradictsStamp(
  table: MirrorTable,
  clinicId: string,
  type: string
): Promise<boolean> {
  const stamp = await getLastSyncMetadata(clinicId, type);
  if (!stamp) return false;

  const { ok, rows } = await getCachedRowsResult(table, clinicId, { limit: 1 });
  // An unreadable store is a contradiction too: the stamp cannot be trusted
  // about a mirror we could not even open.
  return !ok || rows.length === 0;
}

/* -------------------------------------------------------------- sync_queue */

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  description: string;
  timestamp: number;
  attempts?: number;
  lastError?: string | null;
  status?: string;
}

export async function saveActionToOfflineQueue(action: QueuedAction): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    await handle.execute(
      `INSERT OR REPLACE INTO sync_queue
         (id, action_type, payload, description, timestamp, attempts, last_error, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        action.id,
        action.type,
        JSON.stringify(action.payload ?? null),
        action.description ?? '',
        action.timestamp,
        action.attempts ?? 0,
        action.lastError ?? null,
        action.status ?? 'pending',
      ]
    );
  } catch (err) {
    console.error('SQLite queue save error:', err);
  }
}

export async function getOfflineQueue(): Promise<QueuedAction[]> {
  const handle = await getOfflineDb();
  if (!handle) return [];
  try {
    const result: any[] = await handle.select(
      "SELECT * FROM sync_queue WHERE status != $1 ORDER BY timestamp ASC",
      ['synced']
    );
    return result.map((r) => ({
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
    console.error('SQLite queue retrieval error:', err);
    return [];
  }
}

export async function removeActionFromOfflineQueue(actionId: string): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    await handle.execute('DELETE FROM sync_queue WHERE id = $1', [actionId]);
  } catch (err) {
    console.error('SQLite queue delete error:', err);
  }
}

/** Record a failed drain attempt so a poison action cannot spin forever. */
export async function markQueueAttempt(
  actionId: string,
  error: string
): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    await handle.execute(
      'UPDATE sync_queue SET attempts = attempts + 1, last_error = $2 WHERE id = $1',
      [actionId, error.slice(0, 500)]
    );
  } catch (err) {
    console.error('SQLite queue attempt error:', err);
  }
}

export async function getOfflineQueueDepth(): Promise<number> {
  const handle = await getOfflineDb();
  if (!handle) return 0;
  try {
    const result: any[] = await handle.select(
      "SELECT COUNT(*) as n FROM sync_queue WHERE status != $1",
      ['synced']
    );
    return Number(result[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ teardown */

/**
 * Wipe every mirrored table. Used on sign-out and on a clinic switch.
 *
 * `sync_metadata` goes with it deliberately: leaving stamps behind after the
 * data they certify has been deleted recreates exactly the
 * stamp-outlives-its-data problem `cacheContradictsStamp` exists to catch.
 */
export async function clearAllTables(): Promise<void> {
  const handle = await getOfflineDb();
  if (!handle) return;
  try {
    for (const table of [...ALL_TABLES, 'profiles', 'sync_metadata', 'sync_queue']) {
      await handle.execute(`DELETE FROM ${table}`);
    }
  } catch (err) {
    console.error('SQLite clear error:', err);
  }
}
