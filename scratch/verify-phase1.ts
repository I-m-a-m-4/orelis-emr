/**
 * Throwaway verification for the Phase 1 logic. Run: npx tsx scratch/verify-phase1.ts
 */
import assert from 'node:assert';
import { writtenSince } from '../src/lib/offline/watermark';
import { computeClinicMetrics } from '../src/lib/dashboard-metrics';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

/* ------------------------------------------- watermark (pending-write guard) */

const watermark = now - 5 * 60 * 1000;

assert.equal(
  writtenSince(JSON.stringify({ updatedAt: iso(now) }), watermark),
  true,
  'a row written just now must be protected from reconciliation'
);
assert.equal(
  writtenSince(JSON.stringify({ updatedAt: iso(now - 2 * DAY) }), watermark),
  false,
  'a row from two days ago is the server\'s to delete'
);
assert.equal(
  writtenSince(JSON.stringify({ createdAt: iso(now) }), watermark),
  true,
  'createdAt is the documented fallback when updatedAt is absent'
);
assert.equal(
  writtenSince(JSON.stringify({ name: 'legacy, no stamps' }), watermark),
  false,
  'a pre-withTimestamps row can only have come from a server fetch'
);
assert.equal(writtenSince('{not json', watermark), false, 'corrupt rows stay eligible');
assert.equal(writtenSince({ updatedAt: iso(now) }, watermark), true, 'accepts a parsed record too');

console.log('✓ watermark: 6/6');

/* --------------------------------------------------------- clinic metrics */

const m = computeClinicMetrics({
  patients: [
    // seen recently -> active
    { id: 'p1', registrationDate: iso(now - 10 * DAY), lastVisit: iso(now - 3 * DAY), dob: iso(now - 30 * 365.25 * DAY) },
    // registered inside the 30d window, never returned -> active, and "new"
    { id: 'p2', registrationDate: iso(now - 5 * DAY), dob: iso(now - 50 * 365.25 * DAY) },
    // last seen 200 days ago -> dormant
    { id: 'p3', registrationDate: iso(now - 400 * DAY), lastVisit: iso(now - 200 * DAY) },
  ] as any,
  appointments: [
    { id: 'a1', appointmentDate: iso(now - 2 * DAY), status: 'Completed' },
    { id: 'a2', appointmentDate: iso(now - 1 * DAY), status: 'Scheduled' }, // past + open = not closed out
    { id: 'a3', appointmentDate: iso(now + 3 * DAY), status: 'Scheduled' }, // future
    { id: 'a4', appointmentDate: iso(now - 8 * DAY), status: 'Cancelled' },
  ] as any,
  encounters: [
    { id: 'e1', date: iso(now - 2 * DAY), status: 'Finalized', type: 'Consultation', doctorId: 'd1', diagnosis: 'Malaria' },
    { id: 'e2', date: iso(now - 4 * DAY), status: 'Draft', type: 'Emergency', doctorId: 'd1', diagnosis: 'Malaria' },
    { id: 'e3', date: iso(now - 40 * DAY), status: 'Finalized', type: 'Routine', doctorId: 'd1', diagnosis: 'Anaemia' },
  ] as any,
  staff: [{ uid: 'd1', role: 'doctor' }, { uid: 'r1', role: 'receptionist' }] as any,
  invoices: [
    { id: 'i1', amount: 10_000, status: 'paid', date: iso(now - 5 * DAY) },
    { id: 'i2', amount: 30_000, status: 'unpaid', date: iso(now - 6 * DAY) },
    { id: 'i3', amount: 10_000, status: 'Paid', date: iso(now - 45 * DAY) }, // capitalised on purpose
  ] as any,
  inventory: [{ id: 'v1', quantity: 2, minStock: 5 }, { id: 'v2', quantity: 0 }] as any,
  medications: [
    { id: 'm1', stock: 4, price: 500, expiryDate: iso(now + 30 * DAY) },
    { id: 'm2', stock: 100, price: 200, expiryDate: iso(now + 400 * DAY) },
  ] as any,
  prescriptions: [
    { id: 'r1', status: 'Dispensed' },
    { id: 'r2', status: 'Pending' },
    { id: 'r3', status: 'Cancelled' }, // excluded from both sides of dispense rate
  ] as any,
  labOrders: [
    { id: 'l1', status: 'Pending', priority: 'Urgent' },
    { id: 'l2', status: 'Completed', priority: 'Routine' },
  ] as any,
  admissions: [
    { id: 'ad1', status: 'Admitted', admittedAt: iso(now - 2 * DAY) },
    { id: 'ad2', status: 'Discharged', admittedAt: iso(now - 10 * DAY), dischargedAt: iso(now - 6 * DAY) },
  ] as any,
  beds: [
    { id: 'b1', status: 'Occupied' },
    { id: 'b2', status: 'Available' },
    { id: 'b3', status: 'Maintenance' }, // out of the denominator
  ] as any,
  waitlist: [{ status: 'Waiting' }, { status: 'Seen' }] as any,
});

const checks: [string, unknown, unknown][] = [
  ['totalPatients', m.totalPatients, 3],
  ['newPatients30d', m.newPatients30d, 2],
  ['activePatients90d', m.activePatients90d, 2],
  ['dormantPatients', m.dormantPatients, 1],
  // concluded = a1 Completed, a2 past-Scheduled, a4 Cancelled -> 1/3
  ['completionRate', Math.round(m.completionRate!), 33],
  ['cancellationRate', Math.round(m.cancellationRate!), 25],
  ['overdueAppointments', m.overdueAppointments, 1],
  ['encounters30d', m.encounters30d, 2],
  ['draftNotes', m.draftNotes, 1],
  ['documentationRate', Math.round(m.documentationRate!), 67],
  ['emergencyEncounters30d', m.emergencyEncounters30d, 1],
  ['encountersPerDoctor', m.encountersPerDoctor, 3],
  ['topDiagnosis', m.topDiagnosis?.label, 'Malaria'],
  ['pendingPrescriptions', m.pendingPrescriptions, 1],
  ['dispenseRate', Math.round(m.dispenseRate!), 50],
  ['pendingLabs', m.pendingLabs, 1],
  ['urgentLabs', m.urgentLabs, 1],
  ['currentInpatients', m.currentInpatients, 1],
  ['bedOccupancy', Math.round(m.bedOccupancy!), 50],
  ['avgLengthOfStay', m.avgLengthOfStay, 4],
  ['totalRevenue', m.totalRevenue, 20_000],
  ['revenue30d', m.revenue30d, 10_000],
  ['outstandingAmount', m.outstandingAmount, 30_000],
  ['collectionRate', Math.round(m.collectionRate!), 40],
  ['lowStockItems', m.lowStockItems, 2],
  ['outOfStockItems', m.outOfStockItems, 1],
  ['expiringSoon', m.expiringSoon, 1],
  ['stockValue', m.stockValue, 22_000],
  ['activeDoctors', m.activeDoctors, 1],
  ['waitlistWaiting', m.waitlistWaiting, 1],
];

let failed = 0;
for (const [name, actual, expected] of checks) {
  if (actual !== expected) {
    console.error(`✗ ${name}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

// No baseline in the previous window -> no trend, rather than a fake +100%.
if (m.revenueTrend !== undefined && m.revenue30d > 0) {
  // i3 sits in the previous window, so a trend IS expected here.
  console.log(`  revenueTrend = ${m.revenueTrend.toFixed(1)}% (baseline present)`);
}
if (computeClinicMetrics({ ...({} as any), patients: [], appointments: [], encounters: [], staff: [], invoices: [], inventory: [], medications: [], prescriptions: [], labOrders: [], admissions: [], beds: [], waitlist: [] }).newPatientsTrend !== undefined) {
  console.error('✗ empty clinic must not report a trend');
  failed++;
}

console.log(`${failed === 0 ? '✓' : '✗'} metrics: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
console.log('\nAll Phase 1 logic checks passed.');
