'use client';

/**
 * Runs offline hydration for the signed-in user's clinic and reports its state.
 *
 * Split out of `DashboardProvider` because the ordering rules here are subtle
 * enough to want their own file: hydration must be keyed by clinic (not by
 * render), must not re-run on every navigation, and must re-run when the network
 * comes back — while never blocking the dashboard from rendering, since the whole
 * point is that the app works before and without it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createContext, useContext, type ReactNode } from 'react';

import { useFirestore } from '@/firebase';
import { startQueueDrain } from '@/lib/api-client';
import type { UserProfile } from '@/lib/types';

import { hydrateClinicData, type HydrationResult } from './sync';
import { initMirror, mirrorBackendName, offlineMirrorUsable, type MirrorBackendName } from './mirror';

export type HydrationStatus = 'idle' | 'syncing' | 'synced' | 'partial' | 'failed';

export interface OfflineSyncState {
    status: HydrationStatus;
    /** Result of the most recent completed run, for the admin sync-health panel. */
    lastResult: HydrationResult | null;
    /** Epoch ms of the last completed run, successful or not. */
    lastRunAt: number | null;
    /**
     * Which local store is actually holding the records — `'sqlite'` in a native
     * build, `'indexeddb'` in a browser or in a native build whose SQLite file
     * could not be opened. Null until the probe finishes, or if no store opened.
     *
     * Surfaced because "offline-ready" is not a single fact. A desktop install
     * silently running on IndexedDB has a smaller, more evictable cache than the
     * one it was sized for, and that is worth being able to see in the admin
     * console rather than inferring from a support call.
     */
    mirror: MirrorBackendName | null;
    /** False once every store this platform has was tried and failed. */
    mirrorUsable: boolean | null;
    /** Force a run past the per-collection throttle. */
    resync: () => void;
}

export function useOfflineSync(
    profile: (UserProfile & { id?: string }) | null | undefined
): OfflineSyncState {
    const firestore = useFirestore();
    const clinicId = profile?.clinicId ?? '';
    const userId = profile?.id ?? profile?.uid ?? '';

    const [status, setStatus] = useState<HydrationStatus>('idle');
    const [lastResult, setLastResult] = useState<HydrationResult | null>(null);
    const [lastRunAt, setLastRunAt] = useState<number | null>(null);
    const [mirror, setMirror] = useState<MirrorBackendName | null>(null);
    const [mirrorUsable, setMirrorUsable] = useState<boolean | null>(null);

    /**
     * Guards against overlapping runs. Two hydrations at once contend for the
     * single mirror writer and duplicate every Firestore read — and this effect
     * can legitimately be triggered twice in quick succession (mount plus an
     * `online` event, or React's development double-invoke).
     */
    const running = useRef(false);
    /** Which clinic we have already hydrated for during this mount. */
    const hydratedFor = useRef<string | null>(null);

    /**
     * Open the local store before anything needs it.
     *
     * Without this the first clinical write pays for creating the schema — 20-odd
     * tables and their indexes — and on a native build that is a file being
     * created on disk. Doing it on mount moves that off the path of a doctor
     * hitting Save, and it means `mirror` is populated for the UI even for a user
     * who never triggers a hydration.
     */
    useEffect(() => {
        let cancelled = false;
        void initMirror().then((name) => {
            if (cancelled) return;
            setMirror(name);
            setMirrorUsable(offlineMirrorUsable());
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const run = useCallback(
        async (force: boolean) => {
            if (!firestore || !clinicId || running.current) return;
            running.current = true;
            setStatus('syncing');

            try {
                const result = await hydrateClinicData(firestore, clinicId, {
                    force,
                    // `syncProfileToOffline` keys on `id`; the profile document's
                    // id is the auth uid, and `UserProfile.id` is optional, so it
                    // is set explicitly rather than hoped for. Without it a cold
                    // offline launch has no way to learn which clinic the user
                    // belongs to, and every scoped read has no key.
                    profile: userId ? { ...profile, id: userId } : undefined,
                });

                setLastResult(result);
                setLastRunAt(Date.now());
                setStatus(
                    result.ok ? 'synced' : result.outcomes.some((o) => o.ok) ? 'partial' : 'failed'
                );
                // A hydration is the first thing that actually exercises the store
                // under load, so re-read the verdict: a mirror that opened fine can
                // still fail on a quota or a locked file mid-write.
                setMirror(mirrorBackendName());
                setMirrorUsable(offlineMirrorUsable());
            } catch (err) {
                // hydrateClinicData already swallows per-target failures, so
                // reaching here means something structural. The cache is
                // untouched either way.
                console.error('[sync] hydration threw:', err);
                setLastRunAt(Date.now());
                setStatus('failed');
            } finally {
                running.current = false;
            }
        },
        [firestore, clinicId, userId, profile]
    );

    // Hydrate once per clinic per mount. Keyed on clinicId rather than on the
    // profile object, which is a fresh object on every snapshot and would
    // otherwise re-trigger this on every unrelated profile field change.
    useEffect(() => {
        if (!firestore || !clinicId) return;
        if (hydratedFor.current === clinicId) return;
        hydratedFor.current = clinicId;
        void run(false);
    }, [firestore, clinicId, run]);

    // Coming back online is the moment the cache is most likely to be stale and
    // the queue most likely to have work. `run(false)` respects the throttle, so
    // a flaky connection that flaps does not turn into a fetch loop.
    useEffect(() => {
        if (typeof window === 'undefined' || !clinicId) return;
        const onOnline = () => void run(false);
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [clinicId, run]);

    // Drains the idempotency-keyed HTTP queue for privileged operations that were
    // attempted offline. Independent of hydration: that is reads, this is writes
    // that could not go direct to Firestore.
    useEffect(() => {
        return startQueueDrain();
    }, []);

    const resync = useCallback(() => void run(true), [run]);

    return { status, lastResult, lastRunAt, mirror, mirrorUsable, resync };
}

/* ------------------------------------------------------------------- context */

/**
 * Sync state, shared.
 *
 * The hook must run exactly once — it owns a Firestore read budget and the single
 * mirror writer — so anything else that wants to show sync state (a header
 * indicator, the admin sync-health panel) reads it from here rather than calling
 * the hook again.
 */
const OfflineSyncContext = createContext<OfflineSyncState | null>(null);

export function OfflineSyncProvider({
    profile,
    children,
}: {
    profile: (UserProfile & { id?: string }) | null | undefined;
    children: ReactNode;
}) {
    const value = useOfflineSync(profile);
    return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

/**
 * Read sync state. Returns a neutral idle state outside the provider rather than
 * throwing: a status indicator is not worth crashing a clinical screen over.
 */
export function useOfflineSyncState(): OfflineSyncState {
    return (
        useContext(OfflineSyncContext) ?? {
            status: 'idle',
            lastResult: null,
            lastRunAt: null,
            mirror: null,
            mirrorUsable: null,
            resync: () => {},
        }
    );
}
