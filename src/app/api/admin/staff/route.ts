import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { requireAuth, assertSameClinic, checkIdempotency } from '@/lib/server/api-auth';
import type { Clinic } from '@/lib/types';

/**
 * Staff administration.
 *
 * Replaces `addStaffAction` and `changeStaffRoleAction` from
 * `src/app/actions.ts`. These cannot run on the client: creating an Auth user and
 * setting a custom claim both require the Admin SDK, and a claim is what the rest
 * of the system trusts for authorisation — letting a client write it would make
 * every other permission check decorative.
 */

const ALLOWED_ROLES = ['admin', 'doctor', 'receptionist'] as const;
type AssignableRole = (typeof ALLOWED_ROLES)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === 'string' && (ALLOWED_ROLES as readonly string[]).includes(value);
}

/** POST — create a staff member. Admin of the target clinic, or super-admin. */
export async function POST(req: Request) {
  const auth = await requireAuth(req, 'admin');
  if (!auth.ok) return auth.response;

  const idem = await checkIdempotency(req);
  if (idem.cached) return NextResponse.json(idem.cached);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, password, name, role, clinicId } = body ?? {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    );
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }
  if (!isAssignableRole(role)) {
    return NextResponse.json(
      { error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.` },
      { status: 400 }
    );
  }

  const clinicMismatch = assertSameClinic(auth.caller, clinicId);
  if (clinicMismatch) return clinicMismatch;

  try {
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name.trim(),
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role, clinicId });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: name.trim(),
      role,
      status: 'active',
      clinicId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (role === 'admin') {
      const clinicDoc = await db.collection('clinics').doc(clinicId).get();
      const clinicData = clinicDoc.data() as Clinic | undefined;
      const expiry = clinicData?.subscription?.expiryDate
        ? new Date(clinicData.subscription.expiryDate).toLocaleDateString()
        : 'N/A';

      await db
        .collection('users')
        .doc(userRecord.uid)
        .collection('notifications')
        .add({
          userId: userRecord.uid,
          clinicId,
          title: 'Welcome to Orelis!',
          message: `Your clinic's trial subscription is active and will expire on ${expiry}.`,
          type: 'welcome',
          read: false,
          timestamp: new Date().toISOString(),
          link: '/dashboard/settings',
        });
    }

    // Audit from the server, because the acting client may never learn the
    // outcome — the request could have been a replay after an outage.
    //
    // `audit_logs` (not `auditLogs`) is the single collection the whole app
    // reads; see AUDIT_COLLECTION in src/lib/audit.ts. `timestamp` is what
    // ordered queries sort on, so an entry without it is written but never
    // listed.
    await db.collection('audit_logs').add({
      clinicId,
      userId: auth.caller.uid,
      userEmail: auth.caller.email ?? 'N/A',
      userRole: auth.caller.role,
      action: 'user.invite',
      entityType: 'user',
      entityId: userRecord.uid,
      details: { entityName: name.trim(), assignedRole: role },
      summary: `${auth.caller.email ?? 'An admin'} invited ${name.trim()} as ${role}`,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      clientCreatedAt: new Date().toISOString(),
    });

    const result = {
      success: true,
      message: `Staff member ${name.trim()} created successfully.`,
      uid: userRecord.uid,
    };
    await idem.record(result);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      // Record it so a replay of an already-applied create returns the same
      // answer rather than reporting a fresh conflict.
      const result = {
        success: false,
        error: 'This email address is already in use by another account.',
      };
      await idem.record(result);
      return NextResponse.json(result, { status: 409 });
    }
    console.error('Error creating staff:', err);
    return NextResponse.json(
      { error: `Failed to add staff: ${err?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }
}

/** PATCH — change a staff member's role. */
export async function PATCH(req: Request) {
  const auth = await requireAuth(req, 'admin');
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { userId, newRole, clinicId } = body ?? {};

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'A user id is required.' }, { status: 400 });
  }
  if (!isAssignableRole(newRole)) {
    return NextResponse.json(
      { error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.` },
      { status: 400 }
    );
  }

  const clinicMismatch = assertSameClinic(auth.caller, clinicId);
  if (clinicMismatch) return clinicMismatch;

  // Removing your own admin rights locks the clinic out of its own staff page,
  // and there may be no other admin to undo it.
  if (userId === auth.caller.uid && newRole !== 'admin' && !auth.caller.superAdmin) {
    return NextResponse.json(
      { error: 'You cannot remove your own admin role.' },
      { status: 400 }
    );
  }

  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    const adminAuth = getAuth(app);

    // The target must belong to this clinic — otherwise an admin could pass any
    // uid and re-role a stranger.
    const targetSnap = await db.collection('users').doc(userId).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    const target = targetSnap.data() as { role?: string; clinicId?: string; name?: string };
    if (!auth.caller.superAdmin && target.clinicId !== auth.caller.clinicId) {
      return NextResponse.json(
        { error: 'That user does not belong to your clinic.' },
        { status: 403 }
      );
    }

    await adminAuth.setCustomUserClaims(userId, { role: newRole, clinicId });
    await db.collection('users').doc(userId).update({
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    await db.collection('audit_logs').add({
      clinicId,
      userId: auth.caller.uid,
      userEmail: auth.caller.email ?? 'N/A',
      userRole: auth.caller.role,
      action: 'user.update_role',
      entityType: 'user',
      entityId: userId,
      details: {
        entityName: target.name ?? null,
        // Before/after on a permission change — unrecoverable once written.
        changes: { role: { from: target.role ?? null, to: newRole } },
      },
      summary: `${auth.caller.email ?? 'An admin'} changed ${
        target.name ?? userId
      } from ${target.role ?? 'unknown'} to ${newRole}`,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      clientCreatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Staff role updated successfully.',
    });
  } catch (err: any) {
    console.error('Error changing staff role:', err);
    return NextResponse.json(
      { error: `Failed to update role: ${err?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }
}
