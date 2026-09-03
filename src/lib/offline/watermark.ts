/**
 * Shared reconciliation helper for the two mirror backends.
 *
 * `./sqlite` and `./idb` deliberately duplicate most of their surface — one
 * speaks SQL and the other speaks object stores, and `MirrorBackend` in
 * ./mirror.ts is the compile-time guard against the two drifting apart. This
 * predicate has no platform coupling at all, so duplicating it would only create
 * a divergence that no type could catch.
 */

/**
 * Was this mirrored row written at or after `watermark`?
 *
 * Reads the record's own `updatedAt`, falling back to `createdAt` — both stamped
 * by `withTimestamps` in src/lib/data/base.ts on every write that goes through
 * `persistRecord`. A row that answers `true` is newer than the server snapshot
 * being reconciled against, which means its Firestore write may simply not have
 * landed yet, and it must not be treated as deleted.
 *
 * `false` for a row carrying neither field: those predate `withTimestamps` and
 * can only have reached the mirror from a server fetch, so the server is the
 * authority on whether they still exist.
 *
 * @param raw The stored JSON blob, or the already-parsed record.
 */
export function writtenSince(raw: unknown, watermark: number): boolean {
  let record: any;

  if (typeof raw === 'string') {
    try {
      record = JSON.parse(raw);
    } catch {
      // An unparseable row cannot prove it is recent. Leaving it eligible for
      // reconciliation is also how corrupt rows eventually get cleaned out.
      return false;
    }
  } else {
    record = raw;
  }

  const stamp = record?.updatedAt ?? record?.createdAt;
  if (typeof stamp !== 'string' || !stamp) return false;

  const ms = new Date(stamp).getTime();
  return Number.isFinite(ms) && ms >= watermark;
}
