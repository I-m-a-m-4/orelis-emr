/**
 * Security-rules tests for firestore.rules.
 *
 *   npm run test:rules
 *
 * These exist because the previous version of that file compiled cleanly and
 * still let any staff account read every patient on the platform. "It parses" and
 * "it isolates tenants" are different claims, and only one of them is worth
 * anything. Each block below is written against a hole that was actually present.
 *
 * Run through the emulator so no real project is touched:
 *   firebase emulators:exec --only firestore "node scratch/rules.test.mjs"
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';

const CLINIC_A = 'clinic-alpha';
const CLINIC_B = 'clinic-beta';

const testEnv = await initializeTestEnvironment({
  projectId: 'orelis-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8085,
  },
});

/** Seed with rules disabled — this is fixture setup, not a thing under test. */
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();

  await setDoc(doc(db, 'users', 'admin-a'), { uid: 'admin-a', role: 'admin', clinicId: CLINIC_A, status: 'active', email: 'admin-a@a.test' });
  await setDoc(doc(db, 'users', 'nurse-a'), { uid: 'nurse-a', role: 'receptionist', clinicId: CLINIC_A, status: 'active', email: 'nurse-a@a.test' });
  await setDoc(doc(db, 'users', 'doctor-a'), { uid: 'doctor-a', role: 'doctor', clinicId: CLINIC_A, status: 'active', email: 'doc-a@a.test' });
  await setDoc(doc(db, 'users', 'admin-b'), { uid: 'admin-b', role: 'admin', clinicId: CLINIC_B, status: 'active', email: 'admin-b@b.test' });
  await setDoc(doc(db, 'users', 'patient-x'), { uid: 'patient-x', role: 'patient', status: 'active', patientId: 'pat-a1', email: 'px@x.test' });
  await setDoc(doc(db, 'users', 'outsider'), { uid: 'outsider', role: 'patient', status: 'active', email: 'out@x.test' });

  await setDoc(doc(db, 'clinics', CLINIC_A), { name: 'Alpha Hospital' });
  await setDoc(doc(db, 'clinics', CLINIC_B), { name: 'Beta Hospital' });

  for (const [id, clinicId] of [['pat-a1', CLINIC_A], ['pat-a2', CLINIC_A], ['pat-b1', CLINIC_B]]) {
    await setDoc(doc(db, 'patients', id), { clinicId, firstName: 'Test', surname: id, patientCode: id.toUpperCase() });
  }
  await setDoc(doc(db, 'encounters', 'enc-a1'), { clinicId: CLINIC_A, patientId: 'pat-a1', soap: { subjective: 'confidential' } });
  await setDoc(doc(db, 'encounters', 'enc-b1'), { clinicId: CLINIC_B, patientId: 'pat-b1', soap: { subjective: 'confidential' } });
  await setDoc(doc(db, 'appointments', 'apt-a1'), { clinicId: CLINIC_A, patientId: 'pat-a1' });
  await setDoc(doc(db, 'appointments', 'apt-b1'), { clinicId: CLINIC_B, patientId: 'pat-b1' });
  await setDoc(doc(db, 'waitlist', 'w-b1'), { clinicId: CLINIC_B, patientName: 'Beta walk-in', status: 'Waiting' });
  await setDoc(doc(db, 'api_keys', 'secret-key-b'), { clinicId: CLINIC_B, apiKey: 'secret-key-b' });
  await setDoc(doc(db, 'audit_logs', 'log-a1'), { clinicId: CLINIC_A, action: 'patient.view' });
  await setDoc(doc(db, 'invitations', 'inv-1'), { clinicId: CLINIC_A, role: 'doctor', email: 'newdoc@a.test', status: 'pending' });
});

const ctx = {
  adminA: testEnv.authenticatedContext('admin-a', { email: 'admin-a@a.test' }),
  nurseA: testEnv.authenticatedContext('nurse-a', { email: 'nurse-a@a.test' }),
  doctorA: testEnv.authenticatedContext('doctor-a', { email: 'doc-a@a.test' }),
  adminB: testEnv.authenticatedContext('admin-b', { email: 'admin-b@b.test' }),
  patientX: testEnv.authenticatedContext('patient-x', { email: 'px@x.test' }),
  outsider: testEnv.authenticatedContext('outsider', { email: 'out@x.test' }),
  anon: testEnv.unauthenticatedContext(),
  attacker: testEnv.authenticatedContext('attacker', { email: 'attacker@evil.test' }),
};

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${err?.message?.split('\n')[0] ?? err}`);
  }
}

function group(title) {
  console.log(`\n${title}`);
}

/* ============================================================ tenant isolation */

group('Cross-tenant isolation (the hole: unscoped `list` rules)');

await check('unfiltered patients query is REJECTED', async () => {
  // The exact call that previously returned every patient on the platform.
  await assertFails(getDocs(collection(ctx.nurseA.firestore(), 'patients')));
});

await check('patients query filtered to own clinic succeeds', async () => {
  await assertSucceeds(getDocs(query(
    collection(ctx.nurseA.firestore(), 'patients'),
    where('clinicId', '==', CLINIC_A)
  )));
});

await check("patients query filtered to ANOTHER clinic is REJECTED", async () => {
  await assertFails(getDocs(query(
    collection(ctx.nurseA.firestore(), 'patients'),
    where('clinicId', '==', CLINIC_B)
  )));
});

await check('reading another clinic\'s patient by id is REJECTED', async () => {
  await assertFails(getDoc(doc(ctx.nurseA.firestore(), 'patients', 'pat-b1')));
});

await check('unfiltered encounters query is REJECTED', async () => {
  await assertFails(getDocs(collection(ctx.doctorA.firestore(), 'encounters')));
});

await check("another clinic's SOAP note by id is REJECTED", async () => {
  await assertFails(getDoc(doc(ctx.doctorA.firestore(), 'encounters', 'enc-b1')));
});

await check('unfiltered appointments query is REJECTED for staff', async () => {
  await assertFails(getDocs(collection(ctx.nurseA.firestore(), 'appointments')));
});

await check('unfiltered appointments query is REJECTED for a patient', async () => {
  // Previously `|| isAuthenticated()` made this succeed platform-wide.
  await assertFails(getDocs(collection(ctx.patientX.firestore(), 'appointments')));
});

await check("another clinic's waitlist cannot be deleted", async () => {
  await assertFails(deleteDoc(doc(ctx.adminA.firestore(), 'waitlist', 'w-b1')));
});

await check("another clinic's API key is unreadable", async () => {
  await assertFails(getDoc(doc(ctx.adminA.firestore(), 'api_keys', 'secret-key-b')));
});

await check('api_keys cannot be enumerated platform-wide', async () => {
  // The document id IS the key, so a successful list leaks every key returned.
  await assertFails(getDocs(collection(ctx.adminA.firestore(), 'api_keys')));
});

await check('unfiltered users query is REJECTED', async () => {
  await assertFails(getDocs(collection(ctx.nurseA.firestore(), 'users')));
});

/* ====================================================== privilege escalation */

group('Privilege escalation (the hole: `allow create: if true` + self-set role)');

await check('a new account cannot self-assign admin over an existing clinic', async () => {
  await assertFails(setDoc(doc(ctx.attacker.firestore(), 'users', 'attacker'), {
    uid: 'attacker', role: 'admin', clinicId: CLINIC_A, status: 'active',
  }));
});

await check('a new account cannot self-assign doctor without an invitation', async () => {
  await assertFails(setDoc(doc(ctx.attacker.firestore(), 'users', 'attacker'), {
    uid: 'attacker', role: 'doctor', clinicId: CLINIC_A, status: 'active',
  }));
});

await check('patient self-registration (no clinic) is allowed', async () => {
  await assertSucceeds(setDoc(doc(ctx.attacker.firestore(), 'users', 'attacker'), {
    uid: 'attacker', role: 'patient', status: 'active', email: 'attacker@evil.test',
  }));
});

await check('a user cannot write a profile for somebody else', async () => {
  await assertFails(setDoc(doc(ctx.attacker.firestore(), 'users', 'someone-else'), {
    uid: 'someone-else', role: 'patient', status: 'active',
  }));
});

await check('a patient cannot promote themselves to admin', async () => {
  // The other one-request escalation: self-update used to permit any role change.
  await assertFails(updateDoc(doc(ctx.patientX.firestore(), 'users', 'patient-x'), {
    role: 'admin', clinicId: CLINIC_A,
  }));
});

await check('a receptionist cannot promote themselves to admin', async () => {
  await assertFails(updateDoc(doc(ctx.nurseA.firestore(), 'users', 'nurse-a'), { role: 'admin' }));
});

await check('a patient CAN still link their own record', async () => {
  await assertSucceeds(updateDoc(doc(ctx.patientX.firestore(), 'users', 'patient-x'), {
    patientId: 'pat-a1',
  }));
});

await check('an admin cannot reassign staff to another clinic', async () => {
  await assertFails(updateDoc(doc(ctx.adminA.firestore(), 'users', 'nurse-a'), { clinicId: CLINIC_B }));
});await check("an admin cannot touch another clinic's staff", async () => {
  await assertFails(updateDoc(doc(ctx.adminB.firestore(), 'users', 'nurse-a'), { name: 'hijacked' }));
});

/* ================================================= invited-staff onboarding */

group('Invited staff onboarding (must keep working — the rule now demands a voucher)');

await check('an invitee CAN create their profile with a matching invitationId', async () => {
  const invitee = testEnv.authenticatedContext('new-doc', { email: 'newdoc@a.test' });
  await assertSucceeds(setDoc(doc(invitee.firestore(), 'users', 'new-doc'), {
    uid: 'new-doc',
    email: 'newdoc@a.test',
    name: 'New Doctor',
    role: 'doctor',
    clinicId: CLINIC_A,
    status: 'active',
    invitationId: 'inv-1',
  }));
});

await check('an invitee cannot upgrade the role the invitation granted', async () => {
  const invitee = testEnv.authenticatedContext('greedy-doc', { email: 'newdoc@a.test' });
  await assertFails(setDoc(doc(invitee.firestore(), 'users', 'greedy-doc'), {
    uid: 'greedy-doc', email: 'newdoc@a.test', name: 'Greedy',
    role: 'admin', clinicId: CLINIC_A, status: 'active', invitationId: 'inv-1',
  }));
});

await check("someone else's invitation cannot be redeemed", async () => {
  const thief = testEnv.authenticatedContext('thief', { email: 'thief@evil.test' });
  await assertFails(setDoc(doc(thief.firestore(), 'users', 'thief'), {
    uid: 'thief', email: 'thief@evil.test', name: 'Thief',
    role: 'doctor', clinicId: CLINIC_A, status: 'active', invitationId: 'inv-1',
  }));
});

await check('an invitation cannot be repointed at another clinic', async () => {
  const invitee = testEnv.authenticatedContext('wrong-clinic', { email: 'newdoc@a.test' });
  await assertFails(setDoc(doc(invitee.firestore(), 'users', 'wrong-clinic'), {
    uid: 'wrong-clinic', email: 'newdoc@a.test', name: 'Wrong',
    role: 'doctor', clinicId: CLINIC_B, status: 'active', invitationId: 'inv-1',
  }));
});

/* ============================================================== role floors */

group('Role floors');

await check('a receptionist cannot author an encounter', async () => {
  await assertFails(setDoc(doc(ctx.nurseA.firestore(), 'encounters', 'new-enc'), {
    clinicId: CLINIC_A, patientId: 'pat-a1', soap: {},
  }));
});

await check('a doctor CAN author an encounter in their clinic', async () => {
  await assertSucceeds(setDoc(doc(ctx.doctorA.firestore(), 'encounters', 'new-enc-2'), {
    clinicId: CLINIC_A, patientId: 'pat-a1', soap: {},
  }));
});

await check('a doctor cannot author an encounter in another clinic', async () => {
  await assertFails(setDoc(doc(ctx.doctorA.firestore(), 'encounters', 'new-enc-3'), {
    clinicId: CLINIC_B, patientId: 'pat-b1', soap: {},
  }));
});

await check('a receptionist cannot delete a patient', async () => {
  await assertFails(deleteDoc(doc(ctx.nurseA.firestore(), 'patients', 'pat-a1')));
});

await check('an admin CAN delete a patient in their clinic', async () => {
  await assertSucceeds(deleteDoc(doc(ctx.adminA.firestore(), 'patients', 'pat-a2')));
});

await check('a receptionist cannot read the audit trail', async () => {
  await assertFails(getDocs(query(
    collection(ctx.nurseA.firestore(), 'audit_logs'),
    where('clinicId', '==', CLINIC_A)
  )));
});

await check('an admin CAN read their own audit trail', async () => {
  await assertSucceeds(getDocs(query(
    collection(ctx.adminA.firestore(), 'audit_logs'),
    where('clinicId', '==', CLINIC_A)
  )));
});

await check('the audit trail is append-only, even for an admin', async () => {
  await assertFails(updateDoc(doc(ctx.adminA.firestore(), 'audit_logs', 'log-a1'), { action: 'rewritten' }));
});

await check('a receptionist cannot change clinic settings', async () => {
  await assertFails(updateDoc(doc(ctx.nurseA.firestore(), 'clinics', CLINIC_A), { name: 'Renamed' }));
});

await check('an admin CAN change their own clinic settings', async () => {
  await assertSucceeds(updateDoc(doc(ctx.adminA.firestore(), 'clinics', CLINIC_A), { name: 'Alpha Hospital Ltd' }));
});

/* ========================================================== patient portal */

group('Patient portal (previously could read nothing at all)');

await check('a patient can read their own encounters', async () => {
  await assertSucceeds(getDocs(query(
    collection(ctx.patientX.firestore(), 'encounters'),
    where('patientId', '==', 'pat-a1')
  )));
});

await check("a patient cannot read another patient's encounters", async () => {
  await assertFails(getDocs(query(
    collection(ctx.patientX.firestore(), 'encounters'),
    where('patientId', '==', 'pat-b1')
  )));
});

await check('a patient can read their own demographics', async () => {
  await assertSucceeds(getDoc(doc(ctx.patientX.firestore(), 'patients', 'pat-a1')));
});

await check("an unlinked account cannot read anyone's chart", async () => {
  await assertFails(getDoc(doc(ctx.outsider.firestore(), 'patients', 'pat-a1')));
});

/* ================================================================ anonymous */

group('Unauthenticated');

await check('anonymous cannot read patients', async () => {
  await assertFails(getDocs(collection(ctx.anon.firestore(), 'patients')));
});

await check('anonymous cannot create a user profile', async () => {
  await assertFails(setDoc(doc(ctx.anon.firestore(), 'users', 'ghost'), { uid: 'ghost', role: 'admin' }));
});

await check('anonymous cannot read the mail queue', async () => {
  await assertFails(getDocs(collection(ctx.anon.firestore(), 'mail')));
});

/* ==================================================================== done */

await testEnv.cleanup();

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
