import type {
    Admission,
    Appointment,
    Bed,
    Encounter,
    LabOrder,
    Medication,
    Patient,
    Prescription,
    UserProfile,
} from '@/lib/types';

/**
 * Every figure on the clinic dashboard, derived in one place.
 *
 * Kept out of the component for two reasons. It is arithmetic over clinical data
 * and deserves to be readable and testable on its own; and several of these
 * numbers are *rates*, where the interesting question is always what sits in the
 * denominator. Those choices are documented at each call site rather than being
 * implied by a one-line JSX expression.
 *
 * ## Two rules the whole file follows
 *
 * 1. **Only fields that exist.** Every property read here is declared in
 *    `src/lib/types.ts`. It is tempting to show a no-show rate or a lab
 *    turnaround time, but `Appointment.status` has no `No-Show` member and
 *    `LabOrder` records no completion timestamp, so both would be invented from
 *    nothing. The honest substitutes are `overdueAppointments` (still marked
 *    Scheduled with the date in the past) and `pendingLabs`.
 *
 * 2. **No baseline, no trend.** `pctChange` returns `undefined` rather than a
 *    percentage when the previous window was empty. A clinic's first month would
 *    otherwise show "+100%" everywhere, which reads as performance rather than as
 *    an absence of history.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a stored ISO date, returning null for the malformed and the missing. */
function at(value: unknown): number | null {
    if (typeof value !== 'string' || !value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function within(value: unknown, since: number, until = Infinity): boolean {
    const ms = at(value);
    return ms !== null && ms > since && ms <= until;
}

/** Percent change, or `undefined` when there is no baseline to compare against. */
function pctChange(current: number, previous: number): number | undefined {
    if (previous <= 0) return undefined;
    return ((current - previous) / previous) * 100;
}

/** A share as a percentage, or `undefined` when the denominator is empty. */
function share(part: number, whole: number): number | undefined {
    if (whole <= 0) return undefined;
    return (part / whole) * 100;
}

function sum(values: number[]): number {
    return values.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

export interface ClinicMetricsInput {
    patients: Patient[] | null;
    appointments: Appointment[] | null;
    encounters: Encounter[] | null;
    staff: UserProfile[] | null;
    invoices: any[] | null;
    /** The general-supplies collection: `quantity` / `minStock`. */
    inventory: any[] | null;
    /** The pharmacy formulary: `stock` / `price` / `expiryDate`. */
    medications: Medication[] | null;
    prescriptions: Prescription[] | null;
    labOrders: LabOrder[] | null;
    admissions: Admission[] | null;
    beds: Bed[] | null;
    waitlist: any[] | null;
}

export interface ClinicMetrics {
    // Patients
    totalPatients: number;
    newPatients30d: number;
    newPatientsTrend?: number;
    registeredToday: number;
    activePatients90d: number;
    dormantPatients: number;
    avgPatientAge?: number;
    // Appointments
    appointmentsToday: number;
    upcomingAppointments: number;
    completionRate?: number;
    cancellationRate?: number;
    overdueAppointments: number;
    avgVisitsPerDay: number;
    waitlistWaiting: number;
    // Clinical
    encounters30d: number;
    encountersTrend?: number;
    draftNotes: number;
    documentationRate?: number;
    emergencyEncounters30d: number;
    encountersPerDoctor?: number;
    topDiagnosis?: { label: string; count: number };
    // Pharmacy & labs
    pendingPrescriptions: number;
    dispenseRate?: number;
    pendingLabs: number;
    urgentLabs: number;
    // Inpatient
    currentInpatients: number;
    bedOccupancy?: number;
    avgLengthOfStay?: number;
    // Revenue
    totalRevenue: number;
    revenue30d: number;
    revenueTrend?: number;
    outstandingAmount: number;
    collectionRate?: number;
    // Stock
    lowStockItems: number;
    outOfStockItems: number;
    expiringSoon: number;
    stockValue: number;
    // Staff
    activeDoctors: number;
    totalStaff: number;
}

export function computeClinicMetrics(input: ClinicMetricsInput): ClinicMetrics {
    const {
        patients, appointments, encounters, staff, invoices,
        inventory, medications, prescriptions, labOrders, admissions, beds, waitlist,
    } = input;

    const now = Date.now();
    const d30 = now - 30 * DAY_MS;
    const d60 = now - 60 * DAY_MS;
    const d90 = now - 90 * DAY_MS;
    const d180 = now - 180 * DAY_MS;
    const todayStr = new Date().toDateString();

    /* ------------------------------------------------------------- patients */

    const allPatients = patients ?? [];
    const newPatients30d = allPatients.filter((p) => within(p.registrationDate, d30)).length;
    const newPatientsPrev30d = allPatients.filter((p) => within(p.registrationDate, d60, d30)).length;

    // "Active" leans on lastVisit and falls back to registration: a patient
    // registered last week who has not been back yet is active, not dormant.
    const lastSeen = (p: Patient) => at(p.lastVisit) ?? at(p.registrationDate);
    const activePatients90d = allPatients.filter((p) => (lastSeen(p) ?? 0) > d90).length;
    const dormantPatients = allPatients.filter((p) => {
        const seen = lastSeen(p);
        return seen !== null && seen <= d180;
    }).length;

    const ages = allPatients
        .map((p) => at(p.dob))
        .filter((ms): ms is number => ms !== null)
        .map((ms) => (now - ms) / (365.25 * DAY_MS))
        .filter((years) => years >= 0 && years < 130);

    /* --------------------------------------------------------- appointments */

    const allAppointments = appointments ?? [];
    const appointmentsToday = allAppointments.filter((a) => {
        const ms = at(a.appointmentDate);
        return ms !== null && new Date(ms).toDateString() === todayStr && a.status === 'Scheduled';
    }).length;

    const upcomingAppointments = allAppointments.filter(
        (a) => (at(a.appointmentDate) ?? 0) > now && a.status === 'Scheduled'
    ).length;

    // Rates are over *concluded* appointments only. Including future bookings in
    // the denominator would make the completion rate fall every time someone
    // books ahead, which is the opposite of what the number should say.
    const past = allAppointments.filter((a) => (at(a.appointmentDate) ?? Infinity) <= now);
    const completed = past.filter((a) => a.status === 'Completed').length;
    const cancelled = allAppointments.filter((a) => a.status === 'Cancelled').length;

    // The honest stand-in for a no-show: the visit date has passed and nobody
    // ever closed the record out.
    const overdueAppointments = past.filter((a) => a.status === 'Scheduled').length;

    const visits30d = allAppointments.filter(
        (a) => within(a.appointmentDate, d30, now) && a.status === 'Completed'
    ).length;

    /* -------------------------------------------------------------- clinical */

    const allEncounters = encounters ?? [];
    const encounters30d = allEncounters.filter((e) => within(e.date, d30)).length;
    const encountersPrev30d = allEncounters.filter((e) => within(e.date, d60, d30)).length;
    const draftNotes = allEncounters.filter((e) => e.status === 'Draft').length;
    const finalized = allEncounters.filter((e) => e.status === 'Finalized').length;
    const emergencyEncounters30d = allEncounters.filter(
        (e) => e.type === 'Emergency' && within(e.date, d30)
    ).length;

    const doctors = (staff ?? []).filter((s) => s.role === 'doctor');

    const diagnosisCounts = new Map<string, number>();
    for (const e of allEncounters) {
        const dx = e.diagnosis?.trim();
        if (dx) diagnosisCounts.set(dx, (diagnosisCounts.get(dx) ?? 0) + 1);
    }
    const topDiagnosis = [...diagnosisCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }))[0];

    /* -------------------------------------------------------- pharmacy, labs */

    const allRx = prescriptions ?? [];
    const pendingPrescriptions = allRx.filter((r) => r.status === 'Pending').length;
    const dispensed = allRx.filter((r) => r.status === 'Dispensed').length;
    // Cancelled scripts are excluded from both sides: they were never meant to
    // be dispensed, so counting them as a failure to dispense is wrong.
    const dispensable = allRx.filter((r) => r.status !== 'Cancelled').length;

    const allLabs = labOrders ?? [];
    const openLabs = allLabs.filter((l) => l.status === 'Pending' || l.status === 'In Progress');

    /* ------------------------------------------------------------- inpatient */

    const allAdmissions = admissions ?? [];
    const currentInpatients = allAdmissions.filter((a) => a.status === 'Admitted').length;

    const allBeds = beds ?? [];
    // Beds under maintenance are out of the denominator — they are not capacity.
    const usableBeds = allBeds.filter((b) => b.status !== 'Maintenance').length;
    const occupiedBeds = allBeds.filter((b) => b.status === 'Occupied').length;

    const stays = allAdmissions
        .filter((a) => a.status === 'Discharged')
        .map((a) => {
            const from = at(a.admittedAt);
            const to = at(a.dischargedAt);
            return from !== null && to !== null && to >= from ? (to - from) / DAY_MS : null;
        })
        .filter((days): days is number => days !== null);

    /* --------------------------------------------------------------- revenue */

    const allInvoices = invoices ?? [];
    const amountOf = (inv: any) => Number(inv?.amount) || 0;
    // Stored lowercase by the billing page; compared case-insensitively so a
    // record written as "Paid" is not silently counted as outstanding.
    const isPaid = (inv: any) => String(inv?.status ?? '').toLowerCase() === 'paid';

    const totalRevenue = sum(allInvoices.filter(isPaid).map(amountOf));
    const revenue30d = sum(allInvoices.filter((i) => isPaid(i) && within(i.date, d30)).map(amountOf));
    const revenuePrev30d = sum(
        allInvoices.filter((i) => isPaid(i) && within(i.date, d60, d30)).map(amountOf)
    );
    const outstandingAmount = sum(allInvoices.filter((i) => !isPaid(i)).map(amountOf));
    const billedTotal = sum(allInvoices.map(amountOf));

    /* ----------------------------------------------------------------- stock */

    const allInventory = inventory ?? [];
    const allMeds = medications ?? [];

    // The two stock collections use different field names, so each is counted on
    // its own terms rather than through one guessed property.
    const lowInventory = allInventory.filter(
        (i) => Number(i?.quantity) > 0 && Number(i?.quantity) <= (Number(i?.minStock) || 5)
    ).length;
    const lowMeds = allMeds.filter((m) => Number(m?.stock) > 0 && Number(m?.stock) <= 10).length;

    const outInventory = allInventory.filter((i) => Number(i?.quantity) <= 0).length;
    const outMeds = allMeds.filter((m) => Number(m?.stock) <= 0).length;

    const expiringSoon = allMeds.filter((m) => {
        const ms = at(m.expiryDate);
        return ms !== null && ms > now && ms <= now + 60 * DAY_MS;
    }).length;

    const stockValue = sum(allMeds.map((m) => (Number(m?.stock) || 0) * (Number(m?.price) || 0)));

    /* ---------------------------------------------------------------- result */

    return {
        totalPatients: allPatients.length,
        newPatients30d,
        newPatientsTrend: pctChange(newPatients30d, newPatientsPrev30d),
        registeredToday: allPatients.filter((p) => {
            const ms = at(p.registrationDate);
            return ms !== null && new Date(ms).toDateString() === todayStr;
        }).length,
        activePatients90d,
        dormantPatients,
        avgPatientAge: ages.length ? sum(ages) / ages.length : undefined,

        appointmentsToday,
        upcomingAppointments,
        completionRate: share(completed, past.length),
        cancellationRate: share(cancelled, allAppointments.length),
        overdueAppointments,
        avgVisitsPerDay: Math.round((visits30d / 30) * 10) / 10,
        waitlistWaiting: (waitlist ?? []).filter((w) => w?.status === 'Waiting').length,

        encounters30d,
        encountersTrend: pctChange(encounters30d, encountersPrev30d),
        draftNotes,
        documentationRate: share(finalized, allEncounters.length),
        emergencyEncounters30d,
        encountersPerDoctor: doctors.length
            ? Math.round((allEncounters.length / doctors.length) * 10) / 10
            : undefined,
        topDiagnosis,

        pendingPrescriptions,
        dispenseRate: share(dispensed, dispensable),
        pendingLabs: openLabs.length,
        urgentLabs: openLabs.filter((l) => l.priority === 'Urgent' || l.priority === 'Emergency')
            .length,

        currentInpatients,
        bedOccupancy: share(occupiedBeds, usableBeds),
        avgLengthOfStay: stays.length ? Math.round((sum(stays) / stays.length) * 10) / 10 : undefined,

        totalRevenue,
        revenue30d,
        revenueTrend: pctChange(revenue30d, revenuePrev30d),
        outstandingAmount,
        collectionRate: share(totalRevenue, billedTotal),

        lowStockItems: lowInventory + lowMeds,
        outOfStockItems: outInventory + outMeds,
        expiringSoon,
        stockValue,

        activeDoctors: doctors.length,
        totalStaff: (staff ?? []).length,
    };
}
