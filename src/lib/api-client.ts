'use client';

import { apiBase, isNativeApp } from '@/lib/platform';
import {
  saveActionToOfflineQueue,
  getOfflineQueue,
  removeActionFromOfflineQueue,
  markQueueAttempt,
  type QueuedAction,
} from '@/lib/offline/mirror';

/**
 * The one way the app talks to a server.
 *
 * Most of Orelis writes straight to Firestore from the client, which is what
 * makes it work offline. This module is for the minority of operations that
 * genuinely cannot: creating a staff Auth user, setting a custom claim, a
 * cascade delete across five collections, and anything that needs a Gemini key.
 * Those live behind `/api` routes and need `firebase-admin`.
 *
 * Two things it has to get right:
 *
 * - **Native builds have no local server.** A static export fetching `/api/...`
 *   resolves against `tauri://localhost` and 404s, so every path is prefixed
 *   with `apiBase()`. On web that prefix is empty and the request stays
 *   same-origin, which is what makes `npm run dev` testable.
 *
 * - **A failed mutation must not vanish.** When the network is down a mutating
 *   call is queued rather than thrown, and replayed by `drainQueue()` on
 *   reconnect. Every queued call carries an idempotency key so a replay that
 *   the server already applied — because the response was lost, not the
 *   request — does not apply it twice. Creating the same doctor's account twice
 *   because a lift lost signal is not an acceptable failure mode.
 */

export interface ApiResult<T = any> {
  ok: boolean;
  /** True when the call was queued for replay instead of being sent. */
  queued?: boolean;
  status?: number;
  data?: T;
  error?: string;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** Give up replaying after this many failures so one poison action cannot spin. */
const MAX_QUEUE_ATTEMPTS = 8;

/**
 * A fresh ID token for the signed-in user.
 *
 * Read lazily through `initializeFirebase()` rather than a hook, because this
 * module is called from event handlers and queue drains as well as components.
 * Returns null when nobody is signed in — the caller still sends the request so
 * the route can answer 401 rather than the client guessing at authorisation.
 */
async function idToken(): Promise<string | null> {
  try {
    const { initializeFirebase } = await import('@/firebase');
    const instances = initializeFirebase();
    const user = instances?.auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Is this a "the network is not there" failure, as opposed to the server
 * answering with an error?
 *
 * Only the former is worth queueing. A 400 or a 403 will fail identically on
 * every replay, so queueing it would fill the queue with calls that can never
 * succeed and hide a real bug behind an ever-growing "pending sync" badge.
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

interface ApiOptions {
  method?: string;
  body?: any;
  /** Queue on network failure instead of returning an error. Default: mutations. */
  queueOnFailure?: boolean;
  /** Human-readable line for the pending-sync list in the admin console. */
  description?: string;
  signal?: AbortSignal;
  /** Set internally when replaying so a replay is never re-queued. */
  idempotencyKey?: string;
}

export async function apiFetch<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<ApiResult<T>> {
  const method = (opts.method || 'GET').toUpperCase();
  const mutating = MUTATING.has(method);
  const shouldQueue = opts.queueOnFailure ?? mutating;
  const key = opts.idempotencyKey ?? newId();
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;

  const enqueue = async (reason: string): Promise<ApiResult<T>> => {
    await saveActionToOfflineQueue({
      id: key,
      type: `http:${method}:${path}`,
      payload: { method, path, body: opts.body ?? null, idempotencyKey: key },
      description: opts.description || `${method} ${path}`,
      timestamp: Date.now(),
      status: 'pending',
    });
    return { ok: false, queued: true, error: reason };
  };

  // Don't even attempt a mutation while the browser knows it is offline —
  // going straight to the queue keeps the UI responsive instead of waiting
  // out a DNS timeout.
  if (shouldQueue && isOffline()) {
    return enqueue('offline');
  }

  try {
    const token = await idToken();
    const headers: Record<string, string> = {
      'Idempotency-Key': key,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

    const text = await res.text();
    let data: any = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      // A 5xx is the server failing, not the request being wrong, so it is
      // worth replaying. A 4xx never is.
      if (shouldQueue && res.status >= 500) {
        return enqueue(`server ${res.status}`);
      }
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.error || data?.message || `Request failed (${res.status})`,
      };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (err: any) {
    // fetch only rejects on network-level failure, which is exactly the
    // queueable case.
    if (err?.name === 'AbortError') {
      return { ok: false, error: 'aborted' };
    }
    if (shouldQueue) {
      return enqueue(err?.message || 'network error');
    }
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * Replay everything the queue is holding, oldest first.
 *
 * Called on reconnect and at startup. Order is preserved because a later action
 * can depend on an earlier one (a role change on a staff member who was created
 * while offline), so the drain stops at the first action that fails rather than
 * skipping past it and applying things out of sequence.
 */
export async function drainQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  if (isOffline()) {
    const pending = await getOfflineQueue();
    return { sent: 0, failed: 0, remaining: pending.length };
  }

  const queue = await getOfflineQueue();
  let sent = 0;
  let failed = 0;

  for (const action of queue) {
    if (!action.type?.startsWith('http:')) continue;

    if ((action.attempts ?? 0) >= MAX_QUEUE_ATTEMPTS) {
      // Leave it in place, still visible in the admin console's pending list —
      // dropping a clinical write silently is worse than surfacing a stuck one.
      failed++;
      continue;
    }

    const { method, path, body, idempotencyKey } = action.payload ?? {};
    if (!method || !path) {
      await removeActionFromOfflineQueue(action.id);
      continue;
    }

    const result = await apiFetch(path, {
      method,
      body,
      idempotencyKey: idempotencyKey || action.id,
      queueOnFailure: false, // it is already queued; never re-enqueue a replay
    });

    if (result.ok) {
      await removeActionFromOfflineQueue(action.id);
      sent++;
      continue;
    }

    // A 4xx will fail the same way forever, so retire it rather than blocking
    // every action behind it.
    if (result.status && result.status >= 400 && result.status < 500) {
      await markQueueAttempt(action.id, result.error || `http ${result.status}`);
      await removeActionFromOfflineQueue(action.id);
      failed++;
      continue;
    }

    await markQueueAttempt(action.id, result.error || 'replay failed');
    failed++;
    break; // preserve ordering — stop at the first transient failure
  }

  const remaining = (await getOfflineQueue()).length;
  return { sent, failed, remaining };
}

/**
 * Drain on reconnect, and once at startup for anything left from last session.
 *
 * Returns a teardown function. Safe to call outside a browser (no-op) so it can
 * live in a provider that also renders on the server.
 */
export function startQueueDrain(): () => void {
  if (typeof window === 'undefined') return () => {};

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void drainQueue().catch(() => {});
  };

  window.addEventListener('online', run);
  // Native shells can resume from suspend with a live connection and no
  // 'online' event, so also drain when the window regains focus.
  if (isNativeApp()) window.addEventListener('focus', run);
  run();

  return () => {
    stopped = true;
    window.removeEventListener('online', run);
    if (isNativeApp()) window.removeEventListener('focus', run);
  };
}

export type { QueuedAction };
