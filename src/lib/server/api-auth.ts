import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';
import { hasPermission } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';

/**
 * Authorisation for the privileged `/api` routes.
 *
 * These routes exist because the native builds are a static export with no
 * server of their own, so anything needing `firebase-admin` — creating an Auth
 * user, setting a custom claim, cascading a delete — is reached over HTTP
 * instead of as a Server Action.
 *
 * That change moves the trust boundary. A Server Action could only be invoked by
 * the app's own client bundle; an `/api` route is a public URL that anyone can
 * POST to. So every route here verifies a Firebase **ID token** and reads the
 * caller's role from its **custom claims**, never from the request body.
 *
 * The claim is the only trustworthy source: a caller who could name their own
 * role in the payload could promote themselves to admin with `curl`. Roles are
 * written to claims by `setCustomUserClaims` in this same set of routes, so the
 * claim and the Firestore `users` document are kept in step.
 */

export interface AuthedCaller {
  uid: string;
  email?: string;
  role: UserRole | 'super-admin';
  clinicId?: string;
  superAdmin: boolean;
}

export type AuthOutcome =
  | { ok: true; caller: AuthedCaller }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string): AuthOutcome {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Verify the bearer token and check the caller clears `minRole`.
 *
 * `checkRevoked: true` is deliberate: a member of staff who was dismissed and
 * disabled must lose access immediately, and without it a token they already
 * hold stays valid for up to an hour.
 */
export async function requireAuth(
  req: Request,
  minRole: UserRole | 'super-admin'
): Promise<AuthOutcome> {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : '';

  if (!token) return deny(401, 'Missing authorization token.');

  try {
    const app = await initializeAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token, true);

    const superAdmin = decoded.superAdmin === true;
    const role = (superAdmin ? 'super-admin' : (decoded.role as UserRole)) || 'patient';

    const caller: AuthedCaller = {
      uid: decoded.uid,
      email: decoded.email,
      role,
      clinicId: (decoded.clinicId as string) || undefined,
      superAdmin,
    };

    if (!hasPermission(caller.role, minRole)) {
      return deny(403, 'Insufficient permissions for this operation.');
    }

    return { ok: true, caller };
  } catch (err: any) {
    // An expired or revoked token is a 401 (re-authenticate), not a 403.
    const code = err?.code || '';
    if (code.includes('expired') || code.includes('revoked')) {
      return deny(401, 'Session expired. Please sign in again.');
    }
    console.error('Token verification failed:', err);
    return deny(401, 'Invalid authorization token.');
  }
}

/**
 * Confirm the caller may act on this clinic.
 *
 * Role alone is not enough: every clinic has an admin, so an admin of clinic A
 * clears an `admin` check and could otherwise delete clinic B's patients. Only a
 * super-admin may act across clinics.
 */
export function assertSameClinic(
  caller: AuthedCaller,
  clinicId: string
): NextResponse | null {
  if (caller.superAdmin) return null;
  if (!clinicId) {
    return NextResponse.json({ error: 'A clinic id is required.' }, { status: 400 });
  }
  if (caller.clinicId !== clinicId) {
    return NextResponse.json(
      { error: 'You may only act on your own clinic.' },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Has this exact request already been applied?
 *
 * The native client replays queued mutations after an outage, and a replay can
 * be a duplicate rather than a retry — the original request may have succeeded
 * with its response lost. Without a dedupe check, "create staff member" queued
 * on a train creates two accounts.
 *
 * Keyed on the client's `Idempotency-Key`, stored in Firestore so it survives a
 * serverless cold start (an in-memory Map would not, which is exactly when a
 * replay arrives).
 */
export async function checkIdempotency(
  req: Request
): Promise<{ key: string | null; cached: any | null; record: (result: any) => Promise<void> }> {
  const key = req.headers.get('idempotency-key');
  if (!key) {
    return { key: null, cached: null, record: async () => {} };
  }

  const { getFirestore } = await import('firebase-admin/firestore');
  const app = await initializeAdminApp();
  const db = getFirestore(app);
  const ref = db.collection('idempotencyKeys').doc(key);

  try {
    const snap = await ref.get();
    if (snap.exists) {
      return { key, cached: snap.data()?.result ?? {}, record: async () => {} };
    }
  } catch (err) {
    // A failed lookup must not block the operation — worst case is a duplicate,
    // which is what the calling route's own validation is there to catch.
    console.error('Idempotency lookup failed:', err);
  }

  return {
    key,
    cached: null,
    record: async (result: any) => {
      try {
        await ref.set({
          result,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Idempotency record failed:', err);
      }
    },
  };
}
