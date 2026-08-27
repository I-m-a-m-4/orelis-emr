'use client';

/**
 * The local mirror, whichever one this platform has.
 *
 * Orelis keeps a readable, writable copy of the clinic's records next to
 * Firestore's own cache, and there are two implementations of it:
 *
 * - `./sqlite` — `@tauri-apps/plugin-sql` against a real SQLite file. Native
 *   builds only. Survives an app reinstall's data directory, holds hundreds of
 *   thousands of rows, and indexes into the JSON blob with `json_extract`.
 * - `./idb` — IndexedDB in the browser. Everywhere else, including the PWA.
 *
 * Everything above this file imports from here and never names a backend. That
 * matters more than it looks: before this facade existed, `syncRowsToOffline` on
 * web hit the SQLite module, found no Tauri, and returned `noMirrorExpected()` —
 * `true`, meaning "there was nothing to write to, so this is not a failure". That
 * was honest when web genuinely had no mirror. It is a lie now, and it is the
 * worst kind: sync would stamp `lastSync` for a collection it had not actually
 * cached anywhere, so the next load would trust the stamp, skip the fetch, and
 * show an empty patient list to a browser that was perfectly capable of holding
 * one.
 *
 * ## The backend is chosen once, by asking rather than assuming
 *
 * `isNativeApp()` says which *build* is running, not which store actually opened.
 * A native build can fail to open SQLite for ordinary reasons — the data
 * directory is read-only under a locked-down hospital SOE, another instance holds
 * the file, the disk is full — and a desktop webview always has IndexedDB
 * sitting right there. So a native build that cannot get a SQLite handle falls
 * back to IndexedDB rather than running with no mirror at all. The records are
 * re-fetched from Firestore into whichever store answered; nothing is lost by
 * landing in the other one.
 *
 * The decision is memoised as a promise so that a burst of concurrent writes at
 * login cannot each start their own probe.
 *
 * ## Why the fallback module is `./idb` and not a set of hardcoded defaults
 *
 * Every wrapper below reads `(await backend()) ?? WEB`. When no backend resolved,
 * delegating to the IndexedDB module still produces the correct answer in each
 * distinct case, because its own null-handle behaviour is exactly the
 * distinction we need:
 *
 * | situation                        | `noMirrorExpected()` | write returns |
 * |----------------------------------|----------------------|---------------|
 * | server render                    | true                 | true — no store to write to |
 * | browser with IndexedDB disabled  | true                 | true — same, honestly absent |
 * | native, SQLite *and* IDB failed  | false                | false — a real failure |
 *
 * That last row is the one worth having. Two stores failing on a platform that
 * has both is not "no mirror expected", it is a broken install, and sync must see
 * `false` so it does not stamp.
 */

import * as sqliteMirror from './sqlite';
import * as idbMirror from './idb';
import { isNativeApp } from '@/lib/platform';

export type { MirrorTable, CachedResult, QueuedAction } from './sqlite';
import type { CachedResult, MirrorTable, QueuedAction } from './sqlite';

/**
 * The surface a mirror must implement, defined as the SQLite module's own shape.
 *
 * The two `const` declarations below are the drift guard. `./idb` duplicates
 * `ALL_TABLES`, `CLINIC_SCOPED`, `TIME_FIELD` and every signature from `./sqlite`
 * by hand — it has to, one speaks SQL and the other speaks object stores — and
 * the failure mode of that duplication is a function that quietly takes different
 * arguments on web than on desktop. Typing both modules as `MirrorBackend` turns
 * any such divergence into a compile error in this file instead of a bug that
 * only reproduces on one platform.
 */
type MirrorBackend = Pick<
  typeof sqliteMirror,
  | 'syncRowsToOffline'
  | 'syncRowToOffline'
  | 'deleteRowFromOffline'
  | 'getCachedRowsResult'
  | 'getCachedRows'
  | 'getCachedRowsForPatient'
  | 'getCachedRow'
  | 'syncProfileToOffline'
  | 'getCachedProfile'
  | 'setLastSyncMetadata'
  | 'getLastSyncMetadata'
  | 'cacheContradictsStamp'
  | 'saveActionToOfflineQueue'
  | 'getOfflineQueue'
  | 'removeActionFromOfflineQueue'
  | 'markQueueAttempt'
  | 'getOfflineQueueDepth'
  | 'clearAllTables'
>;

const NATIVE: MirrorBackend = sqliteMirror;
const WEB: MirrorBackend = idbMirror;

export type MirrorBackendName = 'sqlite' | 'indexeddb';

/** Which store answered, once one has. Null until `backend()` has run. */
let activeName: MirrorBackendName | null = null;
let resolved: MirrorBackend | null | undefined;
let resolving: Promise<MirrorBackend | null> | null = null;

async function backend(): Promise<MirrorBackend | null> {
  if (resolved !== undefined) return resolved;
  if (resolving) return resolving;

  resolving = (async () => {
    if (isNativeApp()) {
      const handle = await sqliteMirror.getOfflineDb();
      if (handle) {
        activeName = 'sqlite';
        resolved = NATIVE;
        return NATIVE;
      }
      // A native build with no SQLite handle. `getOfflineDb` has already logged
      // the cause; what matters here is not giving up, because the webview below
      // us has IndexedDB and an EMR with no local copy of the ward round is the
      // outcome this whole subsystem exists to prevent.
      console.warn(
        '[mirror] SQLite unavailable in a native build — falling back to IndexedDB. ' +
          'Records will be re-fetched into the webview store.'
      );
    }

    const idbHandle = await idbMirror.getOfflineIdb();
    if (idbHandle) {
      activeName = 'indexeddb';
      resolved = WEB;
      return WEB;
    }

    activeName = null;
    resolved = null;
    return null;
  })();

  return resolving;
}

/**
 * Open the mirror now rather than on first use.
 *
 * Worth calling once after sign-in: it moves the schema creation off the path of
 * the first write, and it populates `mirrorBackendName()` so the admin console
 * and the sync indicator can say which store is live before anything has been
 * read.
 */
export async function initMirror(): Promise<MirrorBackendName | null> {
  await backend();
  return activeName;
}

/** Which store is in use, or null if none opened. Requires `backend()` to have run. */
export function mirrorBackendName(): MirrorBackendName | null {
  return activeName;
}

/**
 * What the last open attempt proved, across both backends.
 *
 * `null` = not attempted yet, `true` = a store is open, `false` = every store
 * this platform has was tried and failed. The sync indicator uses `false` to say
 * "running without a local copy" rather than pretending everything is cached.
 */
export function offlineMirrorUsable(): boolean | null {
  if (resolved !== undefined) return resolved !== null;
  const native = sqliteMirror.offlineDbUsable();
  const web = idbMirror.offlineIdbUsable();
  if (native === true || web === true) return true;
  if (native === null && web === null) return null;
  return false;
}

/* -------------------------------------------------------------------------- */
/* Delegating wrappers                                                        */
/*                                                                            */
/* Deliberately explicit rather than generated with a Proxy: these are the     */
/* signatures the rest of the app is written against, and a `go to definition` */
/* that lands on real parameter names is worth more than the lines saved.      */
/* -------------------------------------------------------------------------- */

export async function syncRowsToOffline(
  table: MirrorTable,
  clinicId: string,
  rows: any[]
): Promise<boolean> {
  return ((await backend()) ?? WEB).syncRowsToOffline(table, clinicId, rows);
}

export async function syncRowToOffline(
  table: MirrorTable,
  clinicId: string,
  row: any
): Promise<boolean> {
  return ((await backend()) ?? WEB).syncRowToOffline(table, clinicId, row);
}

export async function deleteRowFromOffline(table: MirrorTable, id: string): Promise<void> {
  return ((await backend()) ?? WEB).deleteRowFromOffline(table, id);
}

export async function getCachedRowsResult<T = any>(
  table: MirrorTable,
  clinicId: string,
  opts: { limit?: number; orderByTime?: boolean } = {}
): Promise<CachedResult<T>> {
  return ((await backend()) ?? WEB).getCachedRowsResult<T>(table, clinicId, opts);
}

export async function getCachedRows<T = any>(
  table: MirrorTable,
  clinicId: string,
  opts: { limit?: number; orderByTime?: boolean } = {}
): Promise<T[]> {
  return ((await backend()) ?? WEB).getCachedRows<T>(table, clinicId, opts);
}

export async function getCachedRowsForPatient<T = any>(
  table: MirrorTable,
  patientId: string,
  opts: { limit?: number } = {}
): Promise<CachedResult<T>> {
  return ((await backend()) ?? WEB).getCachedRowsForPatient<T>(table, patientId, opts);
}

export async function getCachedRow<T = any>(
  table: MirrorTable,
  id: string
): Promise<T | null> {
  return ((await backend()) ?? WEB).getCachedRow<T>(table, id);
}

export async function syncProfileToOffline(profile: any): Promise<void> {
  return ((await backend()) ?? WEB).syncProfileToOffline(profile);
}

export async function getCachedProfile<T = any>(userId: string): Promise<T | null> {
  return ((await backend()) ?? WEB).getCachedProfile<T>(userId);
}

export async function setLastSyncMetadata(
  clinicId: string,
  type: string,
  timestamp: number
): Promise<void> {
  return ((await backend()) ?? WEB).setLastSyncMetadata(clinicId, type, timestamp);
}

export async function getLastSyncMetadata(clinicId: string, type: string): Promise<number> {
  return ((await backend()) ?? WEB).getLastSyncMetadata(clinicId, type);
}

export async function cacheContradictsStamp(
  table: MirrorTable,
  clinicId: string,
  type: string
): Promise<boolean> {
  return ((await backend()) ?? WEB).cacheContradictsStamp(table, clinicId, type);
}

export async function saveActionToOfflineQueue(action: QueuedAction): Promise<void> {
  return ((await backend()) ?? WEB).saveActionToOfflineQueue(action);
}

export async function getOfflineQueue(): Promise<QueuedAction[]> {
  return ((await backend()) ?? WEB).getOfflineQueue();
}

export async function removeActionFromOfflineQueue(actionId: string): Promise<void> {
  return ((await backend()) ?? WEB).removeActionFromOfflineQueue(actionId);
}

export async function markQueueAttempt(actionId: string, error: string): Promise<void> {
  return ((await backend()) ?? WEB).markQueueAttempt(actionId, error);
}

export async function getOfflineQueueDepth(): Promise<number> {
  return ((await backend()) ?? WEB).getOfflineQueueDepth();
}

/**
 * Wipe every table in the active store.
 *
 * Called when the cache owner changes (see `claimCacheForClinic` in `./sync`) —
 * a workstation signed into clinic A must not leave clinic A's patients readable
 * to clinic B. Only the active backend is cleared, which is correct: the other
 * one was never written to in this install. The exception is a native build that
 * fell back mid-life, and for that the safe move is to clear both, because a
 * SQLite file written before the fallback would still be sitting on disk holding
 * the previous tenant's records.
 */
export async function clearAllTables(): Promise<void> {
  const active = (await backend()) ?? WEB;
  await active.clearAllTables();

  // Belt and braces for the fallback case. On web this is a no-op (no Tauri, no
  // handle); on a native build still using SQLite the second call is the same
  // module and clears an already-empty store. Cheap either way, and it closes
  // the one path where PHI could outlive a tenant change.
  if (active !== NATIVE && isNativeApp()) {
    await NATIVE.clearAllTables();
  }
}
