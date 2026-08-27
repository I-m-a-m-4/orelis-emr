'use client';

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import { syncRowToOffline, deleteRowFromOffline, type MirrorTable } from '@/lib/offline/mirror';

/**
 * The offline-first write primitive every clinical mutation goes through.
 *
 * ## Why nothing here awaits the Firestore promise
 *
 * This is the single most important thing to understand before editing this
 * file. `addDoc`/`setDoc` return a promise that resolves when the **server**
 * acknowledges the write. With no network that promise simply never settles —
 * it does not reject, it hangs. So the obvious-looking code
 *
 * ```ts
 * await addDoc(collection(firestore, 'encounters'), data);  // hangs offline
 * toast('Saved');                                           // never runs
 * ```
 *
 * produces a spinner that spins until the wifi returns. A doctor in a ward with
 * no signal would conclude the note was lost and write it again on paper.
 *
 * What *does* happen immediately, offline, is that Firestore applies the write to
 * its local cache and fires every active listener with
 * `metadata.hasPendingWrites === true` (`useCollection` in
 * `src/firebase/firestore/use-collection.tsx` already surfaces this). So the
 * correct shape is:
 *
 * - generate the document id on the client, so the caller has it instantly;
 * - fire the Firestore write **without awaiting it**, with a `.catch` so an
 *   eventual rejection cannot surface as an unhandled rejection;
 * - await only the local SQLite mirror, which is fast and cannot hang;
 * - return the id.
 *
 * The write is now durable in two local places and will reach the server when
 * the network returns, because Firestore's own queue outlives the page.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Stamp a record for delta sync.
 *
 * `updatedAt` is what lets a refresh ask for `where('updatedAt','>',lastSync)`
 * instead of re-reading the whole collection, so every write must set it — a
 * record written without it is invisible to delta sync and will only ever be
 * picked up by a full re-sync.
 */
export function withTimestamps<T extends Record<string, any>>(
  data: T,
  isNew: boolean
): T & { updatedAt: string; createdAt?: string } {
  const ts = nowIso();
  return {
    ...data,
    ...(isNew ? { createdAt: (data as any).createdAt ?? ts } : {}),
    updatedAt: ts,
  };
}

export interface PersistResult {
  id: string;
  /** True when the local mirror confirmed the row reached disk. */
  mirrored: boolean;
  /**
   * Resolves when the server acknowledges. Callers normally ignore this — await
   * it only where server confirmation is genuinely required before proceeding.
   */
  serverAck: Promise<void>;
}

export interface PersistOptions<T> {
  firestore: Firestore;
  /** Firestore collection name. */
  collectionName: string;
  /** Local mirror table — usually the same concept, snake_cased. */
  table: MirrorTable;
  clinicId: string;
  /** Omit to create with a client-generated id. */
  id?: string | null;
  data: T;
  /** Merge into the existing document rather than replacing it. */
  merge?: boolean;
}

/**
 * Write a record to Firestore and the local mirror, returning immediately.
 *
 * See the module comment for why the Firestore write is not awaited.
 */
export async function persistRecord<T extends Record<string, any>>(
  opts: PersistOptions<T>
): Promise<PersistResult> {
  const { firestore, collectionName, table, clinicId, data, merge } = opts;
  const isNew = !opts.id;

  // A client-generated id is what makes an instant return possible: the caller
  // can navigate to the new record before the server has ever heard of it.
  const ref = opts.id
    ? doc(firestore, collectionName, opts.id)
    : doc(collection(firestore, collectionName));

  const record = withTimestamps({ ...data, clinicId }, isNew) as T & {
    clinicId: string;
    updatedAt: string;
  };

  // Fire, do not await. The `.catch` matters: with no handler, a write that is
  // eventually rejected (a rules change, a quota) surfaces as an unhandled
  // rejection long after the user moved on.
  const serverAck = setDoc(ref, record, merge ? { merge: true } : {}).catch(
    (err) => {
      console.error(`Firestore write failed (${collectionName}/${ref.id}):`, err);
      throw err;
    }
  );
  // Keep the rejection from escaping while still exposing it on `serverAck`.
  void serverAck.catch(() => {});

  const mirrored = await syncRowToOffline(table, clinicId, { id: ref.id, ...record });

  return { id: ref.id, mirrored, serverAck };
}

/**
 * Delete a record locally and on the server.
 *
 * Same non-blocking contract as `persistRecord`. Note this is a *simple* delete:
 * anything that has to remove related records across collections is a privileged
 * cascade and belongs behind `/api/admin/cascade-delete`, because doing it from
 * the client means a half-finished cascade if the tab closes midway.
 */
export async function deleteRecord(opts: {
  firestore: Firestore;
  collectionName: string;
  table: MirrorTable;
  id: string;
}): Promise<{ serverAck: Promise<void> }> {
  const { firestore, collectionName, table, id } = opts;

  const serverAck = deleteDoc(doc(firestore, collectionName, id)).catch((err) => {
    console.error(`Firestore delete failed (${collectionName}/${id}):`, err);
    throw err;
  });
  void serverAck.catch(() => {});

  await deleteRowFromOffline(table, id);

  return { serverAck };
}
