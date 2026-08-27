'use client';

/**
 * Pulls a clinic's working set from Firestore into the local mirror.
 *
 * This is the read half of offline-first: `src/lib/data/base.ts` handles writes,
 * and this file makes sure that when a device goes offline it already holds the
 * records a clinician will ask for. Everything here is bounded, throttled, and
 * refuses to record success it did not achieve.
 *
 * ## The three rules this file exists to enforce
 *
 * 1. **Never stamp a sync that did not land.** `sync_metadata` carries a
 *    throttle, so a stamp written after a failed fetch or a failed mirror write
 *    means the device will not try again for the length of the throttle — it sits
 *    there with an empty cache and a note saying it is up to date. Every stamp in
 *    this file is written only after both the fetch and the disk write returned
 *    true.
 *
 * 2. **Never let one clinic's cache serve another.** See `claimCacheForClinic`.
 *
 * 3. **A bounded query, always.** An unbounded `getDocs(collection(...))` on a
 *    hospital's encounters is tens of thousands of document reads on every
 *    hydration, billed per read, on a phone. Every target below carries an
 *    explicit `limit` and an ordering so that the slice we keep is the *recent*
 *    slice rather than whatever Firestore returned first.
 */

import {
    collection,
    getDocs,
    limit as fbLimit,
    orderBy,
    query,
    where,
    type Firestore,
    type Query,
} from 'firebase/firestore';

import {
    cacheContradictsStamp,
    clearAllTables,
    getLastSyncMetadata,
    setLastSyncMetadata,
    syncProfileToOffline,
    syncRowsToOffline,
    type MirrorTable,
} from './mirror';

/* ------------------------------------------------------------ cache ownership */

/**
 * Which clinic the local mirror currently belongs to.
 *
 * Deliberately in `localStorage` and not in SQLite: it has to be readable and
 * writable even when the database is the thing that is broken, since "the
 * database was recreated" is exactly the case this guard covers.
 */
const CACHE_OWNER_KEY = 'orelis_cache_owner_clinic_id';

export type CacheOwnership =
    /** No marker and nothing to protect — a first run on this device. */
    | 'first-run'
    /** No marker but data present: a pre-guard install, adopted as-is. */
    | 'adopted'
    /** Marker matches; the cache is ours. */
    | 'same-owner'
    /** Marker belonged to another clinic; everything local was destroyed. */
    | 'wiped'
    /** localStorage unreadable, so ownership cannot be established. */
    | 'unknown';

function readOwner(): string | null | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        return localStorage.getItem(CACHE_OWNER_KEY);
    } catch {
        // Private mode, or a policy-locked profile. `undefined` means "could not
        // tell", which is treated differently from "no owner".
        return undefined;
    }
}

function writeOwner(clinicId: string): void {
    try {
        localStorage.setItem(CACHE_OWNER_KEY, clinicId);
    } catch {
        /* see readOwner */
    }
}

/**
 * Establish that the local mirror belongs to this clinic, destroying it if not.
 *
 * ## Why this is not optional
 *
 * A shared machine is the norm in a hospital: a ward PC, a tablet at reception, a
 * demo laptop that visits three clinics in a week. Orelis is multi-tenant, so the
 * same install can be signed into by staff of different clinics, and the local
 * SQLite file survives sign-out.
 *
 * Reads are already scoped (`WHERE clinic_id = ?`), so the acute failure is not
 * "clinic B sees clinic A's chart in the UI". It is worse in two quieter ways:
 *
 * - **Data at rest.** Clinic A's patient records stay on a device now operated by
 *   clinic B. That is an unauthorised disclosure of PHI whether or not anything
 *   renders it, and no clinical agreement covers it.
 * - **A stamp that outlives its data.** `sync_metadata` is keyed by clinic, but
 *   the throttle it drives is global to the file. A cache holding another
 *   tenant's rows plus our stamps is exactly the state that makes hydration
 *   decide there is nothing to do.
 *
 * So on a mismatch the entire mirror is dropped. Losing a cache costs one
 * re-sync; keeping the wrong one is a breach.
 *
 * A *missing* marker is treated as a legacy install and adopted rather than
 * wiped: builds before this guard existed wrote no marker, and wiping them would
 * throw away a working offline cache on upgrade for no safety gain, since there
 * was only ever one tenant per install in that era.
 */
export async function claimCacheForClinic(clinicId: string): Promise<CacheOwnership> {
    if (!clinicId) return 'unknown';

    const owner = readOwner();

    if (owner === undefined) {
        // Cannot read the marker, so cannot prove the cache is ours. Do not wipe
        // (that would destroy a good cache every launch in a locked-down
        // browser profile) and do not claim it either.
        return 'unknown';
    }

    if (owner === clinicId) return 'same-owner';

    if (owner === null) {
        writeOwner(clinicId);
        return 'adopted';
    }

    console.warn(
        `[sync] Local cache belongs to clinic ${owner}, now signed in as ${clinicId}. ` +
            `Destroying the local mirror before hydrating.`
    );
    await clearAllTables();
    writeOwner(clinicId);
    return 'wiped';
}

/** Forget the ownership marker. Call on sign-out alongside `clearAllTables()`. */
export function releaseCacheOwnership(): void {
    try {
        localStorage.removeItem(CACHE_OWNER_KEY);
    } catch {
        /* nothing to do */
    }
}

/* ------------------------------------------------------------------- targets */

interface SyncTarget {
    /** Local mirror table; also the Firestore collection name. */
    table: MirrorTable;
    /** `sync_metadata` type key. Kept distinct from the table name so the two can diverge. */
    type: string;
    /** Filter on `clinicId` server-side. False only for genuinely global collections. */
    scoped: boolean;
    /** Hard ceiling on documents read per sync. */
    limit: number;
    /**
     * Field to order by, descending, so `limit` keeps the newest slice.
     *
     * Must match `TIME_FIELD` in sqlite.ts for the same table, otherwise the rows
     * chosen here and the rows the local `ORDER BY created_at` surfaces are
     * different sets — the mirror would hold the newest 500 by one definition and
     * page through them by another.
     */
    orderByField?: string;
}

/**
 * What a clinician needs on a device that may lose the network.
 *
 * Limits are per collection and deliberately unequal: a formulary is small and
 * wholly needed, an invoice ledger is large and only recently relevant.
 *
 * `audit_logs` is absent on purpose. It is append-only, unbounded, read by
 * administrators on a connected machine, and mirroring it would dominate both the
 * read bill and the local file for data no clinician opens.
 */
const TARGETS: SyncTarget[] = [
    { table: 'patients', type: 'patients', scoped: true, limit: 1000, orderByField: 'registrationDate' },
    { table: 'encounters', type: 'encounters', scoped: true, limit: 800, orderByField: 'date' },
    { table: 'appointments', type: 'appointments', scoped: true, limit: 500, orderByField: 'appointmentDate' },
    { table: 'prescriptions', type: 'prescriptions', scoped: true, limit: 500, orderByField: 'date' },
    { table: 'lab_orders', type: 'lab_orders', scoped: true, limit: 500, orderByField: 'requestedAt' },
    { table: 'admissions', type: 'admissions', scoped: true, limit: 300, orderByField: 'admittedAt' },
    { table: 'invoices', type: 'invoices', scoped: true, limit: 300, orderByField: 'date' },
    // Reference data: small, unordered, and needed in full. A partial formulary
    // is worse than none — it makes a drug look unavailable rather than unloaded.
    { table: 'medications', type: 'medications', scoped: true, limit: 2000 },
    { table: 'wards', type: 'wards', scoped: true, limit: 200 },
    { table: 'beds', type: 'beds', scoped: true, limit: 1000 },
];

/**
 * How long a successful sync suppresses the next one.
 *
 * Short enough that a device left open through a shift keeps up, long enough
 * that navigating between pages does not re-read the collection. Writes do not
 * wait for this — `persistRecord` mirrors its own row immediately, so the local
 * copy of anything typed on this device is never stale.
 */
const SYNC_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Delta sync is off, and turning it on before the backfill runs loses records.
 *
 * The intended query is `where('updatedAt','>',lastSync)`, which is far cheaper
 * than re-reading a collection. But Firestore's inequality filters match only
 * documents that *have* the field: any record written before
 * `withTimestamps()` existed has no `updatedAt` and is silently excluded — not
 * errored, excluded. Every historical patient would disappear from the mirror on
 * the first delta sync, and the stamp would then suppress the full sync that
 * would have restored them.
 *
 * Flip this to `true` only after a one-off script has stamped `updatedAt` on
 * every existing document in every collection in TARGETS.
 */
const DELTA_SYNC_ENABLED = false;

/* ------------------------------------------------------------------ fetching */

/**
 * Tables whose contradiction has already been resolved this session.
 *
 * `cacheContradictsStamp` forces one re-sync past the throttle. Without this set
 * it would force one on every call, because the contradiction persists until the
 * fetch completes — turning a bad cache into an unthrottled fetch loop.
 */
const forcedThisSession = new Set<string>();

export interface TargetOutcome {
    table: MirrorTable;
    /** True only when rows were fetched *and* written to disk. */
    ok: boolean;
    fetched: number;
    /** Why nothing was attempted, when nothing was. */
    skipped: 'throttled' | null;
    error?: string;
}

export interface HydrationResult {
    /** True when every attempted target succeeded. */
    ok: boolean;
    ownership: CacheOwnership;
    outcomes: TargetOutcome[];
}

function buildQuery(firestore: Firestore, target: SyncTarget, clinicId: string): Query {
    const clauses: any[] = [];
    if (target.scoped) clauses.push(where('clinicId', '==', clinicId));
    if (target.orderByField) clauses.push(orderBy(target.orderByField, 'desc'));
    clauses.push(fbLimit(target.limit));
    return query(collection(firestore, target.table), ...clauses);
}

/**
 * Fetch one target, falling back to an unordered read if the ordered one needs a
 * composite index that does not exist yet.
 *
 * A `clinicId ==` + `orderBy` pair requires a composite index. Missing indexes
 * surface as `failed-precondition` at *runtime*, on a real device, and would
 * otherwise take down hydration for every collection ordered that way. Falling
 * back keeps the app usable on a fresh project while `firestore.indexes.json` is
 * deployed — at the cost of an arbitrary slice rather than the newest one, which
 * is why it shouts about it.
 */
async function fetchTarget(
    firestore: Firestore,
    target: SyncTarget,
    clinicId: string
): Promise<any[]> {
    try {
        const snap = await getDocs(buildQuery(firestore, target, clinicId));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
        const needsIndex =
            err?.code === 'failed-precondition' || /requires an index/i.test(err?.message ?? '');

        if (!needsIndex || !target.orderByField) throw err;

        console.error(
            `[sync] ${target.table}: the composite index for (clinicId, ${target.orderByField} desc) ` +
                `is missing, so this sync is caching an arbitrary ${target.limit} records instead of ` +
                `the most recent ${target.limit}. Deploy firestore.indexes.json. Original error: ` +
                `${err?.message ?? err}`
        );

        const snap = await getDocs(
            query(
                collection(firestore, target.table),
                ...(target.scoped ? [where('clinicId', '==', clinicId)] : []),
                fbLimit(target.limit)
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
}

async function syncOneTarget(
    firestore: Firestore,
    target: SyncTarget,
    clinicId: string,
    force: boolean
): Promise<TargetOutcome> {
    const stampKey = `${clinicId}:${target.type}`;
    const stamp = await getLastSyncMetadata(clinicId, target.type);
    const age = Date.now() - stamp;

    // A stamp that claims the collection is cached while the mirror holds nothing
    // is a deadlock: the throttle suppresses the fetch that would fix it. Break
    // it once per session, then let the throttle apply again.
    let forcedByContradiction = false;
    if (!force && stamp > 0 && age < SYNC_THROTTLE_MS && !forcedThisSession.has(stampKey)) {
        if (await cacheContradictsStamp(target.table, clinicId, target.type)) {
            console.warn(
                `[sync] ${target.table}: stamped as synced but the mirror is empty or unreadable. ` +
                    `Forcing one re-sync.`
            );
            forcedThisSession.add(stampKey);
            forcedByContradiction = true;
        }
    }

    if (!force && !forcedByContradiction && stamp > 0 && age < SYNC_THROTTLE_MS) {
        return { table: target.table, ok: true, fetched: 0, skipped: 'throttled' };
    }

    try {
        const rows = await fetchTarget(firestore, target, clinicId);

        // `syncRowsToOffline` returns false only when the write did not reach
        // disk on a platform that has a mirror. On web it returns true because
        // "no mirror" is the correct state there, not a failure.
        const mirrored = await syncRowsToOffline(target.table, clinicId, rows);

        if (!mirrored) {
            // Deliberately no stamp. See rule 1 in the module comment.
            return {
                table: target.table,
                ok: false,
                fetched: rows.length,
                skipped: null,
                error: 'fetched but the local write failed',
            };
        }

        await setLastSyncMetadata(clinicId, target.type, Date.now());
        return { table: target.table, ok: true, fetched: rows.length, skipped: null };
    } catch (err: any) {
        // Offline is the expected case here, not an anomaly: hydration runs on
        // every dashboard mount, including in a lift. No stamp, no wipe, and the
        // existing mirror stays exactly as it was.
        const message = err?.message ?? String(err);
        console.warn(`[sync] ${target.table}: ${message}`);
        return { table: target.table, ok: false, fetched: 0, skipped: null, error: message };
    }
}

/* ---------------------------------------------------------------- public API */

/**
 * Bring the local mirror up to date for one clinic.
 *
 * Safe to call on every dashboard mount: throttled per collection, and a failure
 * anywhere leaves the previous cache untouched rather than emptying it.
 *
 * Targets are synced sequentially rather than with `Promise.all`. Ten concurrent
 * Firestore queries plus ten multi-row SQLite writes contend for the same single
 * writer connection and, on a phone on hospital wifi, reliably time each other
 * out. Sequential is slower to finish and far more likely to finish at all.
 */
export async function hydrateClinicData(
    firestore: Firestore,
    clinicId: string,
    opts: { force?: boolean; profile?: any } = {}
): Promise<HydrationResult> {
    if (!firestore || !clinicId) {
        return { ok: false, ownership: 'unknown', outcomes: [] };
    }

    const ownership = await claimCacheForClinic(clinicId);

    // After a wipe every stamp is gone with the data, but the in-memory
    // force-set is not — clear it so the new tenant's first sync is not treated
    // as already forced.
    if (ownership === 'wiped') forcedThisSession.clear();

    // The profile is what tells a cold, offline launch which clinic the user
    // belongs to, and therefore which rows to read. Without it the app cannot get
    // as far as needing any of the data below.
    if (opts.profile?.id) {
        await syncProfileToOffline(opts.profile);
    }

    const force = opts.force === true || ownership === 'wiped';
    const outcomes: TargetOutcome[] = [];

    for (const target of TARGETS) {
        outcomes.push(await syncOneTarget(firestore, target, clinicId, force));
    }

    return { ok: outcomes.every((o) => o.ok), ownership, outcomes };
}

/** Whether delta sync is live. Exposed so the admin console can report it. */
export function deltaSyncEnabled(): boolean {
    return DELTA_SYNC_ENABLED;
}

/** The collections hydration covers, for the admin sync-health panel. */
export function syncTargets(): ReadonlyArray<{ table: MirrorTable; type: string; limit: number }> {
    return TARGETS.map(({ table, type, limit }) => ({ table, type, limit }));
}

export { SYNC_THROTTLE_MS, CACHE_OWNER_KEY };
