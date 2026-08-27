import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, type Query } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { requireAuth, assertSameClinic } from '@/lib/server/api-auth';

/**
 * Cascading deletes.
 *
 * Replaces `deletePatientAction` and `deleteClinicAction` from
 * `src/app/actions.ts`. These stay on the server for two reasons: they touch an
 * Auth account, and they must either finish or be safely resumable. A cascade
 * driven from a browser tab that gets closed halfway leaves a patient record gone
 * and their invoices orphaned — which is both a data-integrity problem and, for
 * billing, a financial one.
 *
 * ## The 500-operation ceiling
 *
 * A Firestore `WriteBatch` accepts at most 500 operations and rejects the whole
 * batch on the 501st. Both original actions built one unbounded batch from an
 * unbounded query, so deleting a long-standing patient (a decade of encounters,
 * labs and invoices) or any real clinic would fail outright — and fail *after*
 * some sibling `auth.deleteUser` calls had already been awaited, leaving Auth and
 * Firestore inconsistent. Everything here commits in chunks, and Auth deletions
 * happen only after the Firestore work for that user has succeeded.
 */

const BATCH_LIMIT = 450; // headroom under the hard 500

/**
 * Delete every document a query matches, in chunks.
 *
 * Re-queries with a fresh `limit()` each pass rather than paginating with a
 * cursor: the documents are being removed as we go, so a cursor into a shrinking
 * result set can skip rows. Returns the number deleted.
 */
async function deleteQueryInChunks(db: Firestore, query: Query): Promise<number> {
  let total = 0;

  for (;;) {
    const snap = await query.limit(BATCH_LIMIT).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    total += snap.size;

    // A short page means we have reached the end.
    if (snap.size < BATCH_LIMIT) break;
  }

  return total;
}

/**
 * Collections whose documents carry a `patientId`.
 *
 * The names must match the collections the app actually writes to, exactly. A
 * name that is merely plausible — `labOrders` for `lab_orders` — does not error:
 * the query runs against a collection that does not exist, returns nothing, and
 * this function reports a successful delete of zero documents. The patient
 * disappears from the UI and their lab results stay in the database forever,
 * which is the opposite of what a deletion request is for. Verified against the
 * `collection(firestore, …)` call sites in src/.
 */
const PATIENT_SCOPED = [
  'appointments',
  'encounters',
  'invoices',
  'prescriptions',
  'lab_orders',
  'admissions',
] as const;

/** Collections whose documents carry a `clinicId`. Same naming caveat as above. */
const CLINIC_SCOPED = [
  'patients',
  'appointments',
  'encounters',
  'invoices',
  'prescriptions',
  'lab_orders',
  'admissions',
  'medications',
  'wards',
  'beds',
  'waitlist',
  'audit_logs',
] as const;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { target, patientId, clinicId } = body ?? {};

  if (target === 'patient') return deletePatient(req, patientId, clinicId);
  if (target === 'clinic') return deleteClinic(req, clinicId);

  return NextResponse.json(
    { error: "`target` must be 'patient' or 'clinic'." },
    { status: 400 }
  );
}

async function deletePatient(req: Request, patientId: string, clinicId: string) {
  const auth = await requireAuth(req, 'admin');
  if (!auth.ok) return auth.response;

  if (!patientId || !clinicId) {
    return NextResponse.json(
      { error: 'A patient id and clinic id are required.' },
      { status: 400 }
    );
  }

  const mismatch = assertSameClinic(auth.caller, clinicId);
  if (mismatch) return mismatch;

  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    const adminAuth = getAuth(app);

    const patientRef = db.collection('patients').doc(patientId);
    const patientSnap = await patientRef.get();
    if (!patientSnap.exists) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }
    const patient = patientSnap.data() as any;

    // Confirm the record actually belongs to the caller's clinic. Without this,
    // an admin could pass any patient id and delete another hospital's record.
    if (!auth.caller.superAdmin && patient.clinicId !== auth.caller.clinicId) {
      return NextResponse.json(
        { error: 'That patient does not belong to your clinic.' },
        { status: 403 }
      );
    }

    /**
     * Audit *before* deleting, carrying a snapshot of what was removed.
     *
     * After the delete there is nothing left to describe, and the log entry is
     * the only remaining evidence that the record ever existed — so a snapshot
     * of the demographics goes in the log, which survives.
     */
    await db.collection('audit_logs').add({
      clinicId,
      userId: auth.caller.uid,
      userEmail: auth.caller.email ?? 'N/A',
      userRole: auth.caller.role,
      action: 'patient.delete',
      entityType: 'patient',
      entityId: patientId,
      patientId,
      details: {
        entityName: `${patient.firstName ?? ''} ${patient.surname ?? ''}`.trim(),
        snapshotAtDeletion: {
          patientCode: patient.patientCode ?? null,
          firstName: patient.firstName ?? null,
          surname: patient.surname ?? null,
          dob: patient.dob ?? null,
          phone: patient.phone ?? null,
          registrationDate: patient.registrationDate ?? null,
        },
      },
      summary: `${auth.caller.email ?? 'An admin'} deleted patient ${
        `${patient.firstName ?? ''} ${patient.surname ?? ''}`.trim() || patientId
      } and all associated records`,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      clientCreatedAt: new Date().toISOString(),
    });

    const deleted: Record<string, number> = {};
    for (const name of PATIENT_SCOPED) {
      deleted[name] = await deleteQueryInChunks(
        db,
        db.collection(name).where('patientId', '==', patientId)
      );
    }

    // The linked portal account, if the patient ever claimed one. Firestore
    // first, then Auth — so a failed Auth delete leaves a recoverable state
    // rather than an Auth user with no profile.
    const linked = await db
      .collection('users')
      .where('patientId', '==', patientId)
      .limit(10)
      .get();

    for (const userDoc of linked.docs) {
      await userDoc.ref.delete();
      try {
        await adminAuth.deleteUser(userDoc.id);
      } catch (err) {
        console.warn(`Could not delete Auth user ${userDoc.id}:`, err);
      }
    }

    await patientRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Patient and all related records deleted.',
      deleted,
    });
  } catch (err: any) {
    console.error('Error deleting patient:', err);
    return NextResponse.json(
      { error: `Failed to delete patient: ${err?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }
}

async function deleteClinic(req: Request, clinicId: string) {
  // Deleting an entire hospital's data is never a clinic-admin operation.
  const auth = await requireAuth(req, 'super-admin');
  if (!auth.ok) return auth.response;

  if (!clinicId) {
    return NextResponse.json({ error: 'A clinic id is required.' }, { status: 400 });
  }

  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    const adminAuth = getAuth(app);

    const clinicRef = db.collection('clinics').doc(clinicId);
    const clinicSnap = await clinicRef.get();
    if (!clinicSnap.exists) {
      return NextResponse.json({ error: 'Clinic not found.' }, { status: 404 });
    }

    const deleted: Record<string, number> = {};
    for (const name of CLINIC_SCOPED) {
      // `audit_logs` is in that list deliberately. Deleting a trail destroys the
      // record of the teardown itself, which is normally the wrong trade — but
      // these entries embed patient names and deletion snapshots, so they are PHI.
      // Retaining them would leave identifiable data behind after an erasure
      // request, which is worse. Note this only happens for whole-tenant removal;
      // deleting a single patient (PATIENT_SCOPED) leaves their audit trail intact.
      deleted[name] = await deleteQueryInChunks(
        db,
        db.collection(name).where('clinicId', '==', clinicId)
      );
    }

    // Staff: Firestore profile then Auth account, one page at a time.
    let staffDeleted = 0;
    for (;;) {
      const staff = await db
        .collection('users')
        .where('clinicId', '==', clinicId)
        .limit(100)
        .get();
      if (staff.empty) break;

      for (const doc of staff.docs) {
        await doc.ref.delete();
        try {
          await adminAuth.deleteUser(doc.id);
        } catch (err) {
          console.warn(`Could not delete Auth user ${doc.id}:`, err);
        }
        staffDeleted++;
      }

      if (staff.size < 100) break;
    }
    deleted.users = staffDeleted;

    await clinicRef.delete();

    return NextResponse.json({
      success: true,
      message: `Deleted clinic ${clinicId} and all associated data.`,
      deleted,
    });
  } catch (err: any) {
    console.error(`Error deleting clinic ${clinicId}:`, err);
    return NextResponse.json(
      { error: `Failed to delete clinic: ${err?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }
}
