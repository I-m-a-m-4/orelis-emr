'use client';

import {
    Activity, AlertTriangle, ArrowDownWideNarrow, Bed as BedIcon, BadgeDollarSign,
    CalendarCheck, CalendarClock, CalendarX, ClipboardList, Clock, FileWarning,
    FlaskConical, HeartPulse, Hourglass, Package, PackageX, PiggyBank, Pill,
    Receipt, Siren, Stethoscope, Timer, TrendingUp, UserCheck, UserMinus, Users,
} from 'lucide-react';

import { StatCard, type StatTone } from '@/components/dashboard/stat-card';
import { computeClinicMetrics, type ClinicMetricsInput } from '@/lib/dashboard-metrics';

/**
 * The clinic KPI board.
 *
 * Deliberately stat tiles rather than charts: each of these answers "what is this
 * number right now", which is a headline, and a headline plotted over a category
 * axis is harder to read than the number itself. The trends and meters carry the
 * comparison where there is one.
 *
 * Grouped because thirty-odd undifferentiated tiles is a wall. The section
 * headings are what make it scannable — a manager looking for a stock problem
 * should not have to read the revenue figures on the way.
 *
 * Colour is doing one job only: status. A tone is set when a number is
 * *actionable* (unsigned notes, expiring drugs, an overdue clinic list) and left
 * neutral otherwise, and every toned tile pairs the colour with its own icon and
 * label so the state survives colourblindness, forced-colour modes and print.
 */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {title}
                </h2>
                {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {children}
            </div>
        </section>
    );
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

/** A rate as a whole-number percentage, or an em dash when there is no denominator. */
const pct = (v?: number) => (v === undefined ? '—' : `${v.toFixed(0)}%`);

/** Escalate a tone once a count crosses a threshold worth acting on. */
function countTone(n: number, warnAt = 1, criticalAt = Infinity): StatTone {
    if (n >= criticalAt) return 'critical';
    if (n >= warnAt) return 'warning';
    return 'neutral';
}

export function ClinicMetrics(props: ClinicMetricsInput) {
    const m = computeClinicMetrics(props);
    const ic = 'h-4 w-4';

    return (
        <div className="flex flex-col gap-8">
            <Section title="Patients" hint="Registrations and engagement">
                <StatCard
                    title="Total Patients"
                    value={m.totalPatients.toLocaleString()}
                    icon={<Users className={ic} />}
                    href="/dashboard/patients"
                />
                <StatCard
                    title="New This Month"
                    value={m.newPatients30d.toLocaleString()}
                    icon={<TrendingUp className={ic} />}
                    trend={m.newPatientsTrend !== undefined
                        ? { value: m.newPatientsTrend, label: 'vs prev 30d' }
                        : undefined}
                    description={m.newPatientsTrend === undefined ? 'No prior month to compare' : undefined}
                    href="/dashboard/patients"
                />
                <StatCard
                    title="Registered Today"
                    value={m.registeredToday.toLocaleString()}
                    icon={<UserCheck className={ic} />}
                    href="/dashboard/patients/new"
                />
                <StatCard
                    title="Active Patients"
                    value={m.activePatients90d.toLocaleString()}
                    icon={<HeartPulse className={ic} />}
                    description="Seen in the last 90 days"
                    meter={m.totalPatients ? (m.activePatients90d / m.totalPatients) * 100 : undefined}
                    formula="Patients whose last visit (or registration) falls within 90 days, as a share of all patients"
                    href="/dashboard/patients"
                />
                <StatCard
                    title="Dormant Patients"
                    value={m.dormantPatients.toLocaleString()}
                    icon={<UserMinus className={ic} />}
                    description="No visit in 180 days — recall candidates"
                    tone={countTone(m.dormantPatients, 1)}
                    href="/dashboard/patients"
                />
                <StatCard
                    title="Average Age"
                    value={m.avgPatientAge === undefined ? '—' : `${m.avgPatientAge.toFixed(0)} yrs`}
                    icon={<Activity className={ic} />}
                    description={m.avgPatientAge === undefined ? 'No dates of birth recorded' : 'Across all records'}
                />
            </Section>

            <Section title="Appointments" hint="Clinic flow and follow-through">
                <StatCard
                    title="Today's Clinic"
                    value={m.appointmentsToday.toLocaleString()}
                    icon={<CalendarCheck className={ic} />}
                    description="Still scheduled for today"
                    href="/dashboard/appointments"
                />
                <StatCard
                    title="Upcoming Visits"
                    value={m.upcomingAppointments.toLocaleString()}
                    icon={<CalendarClock className={ic} />}
                    href="/dashboard/appointments"
                />
                <StatCard
                    title="Completion Rate"
                    value={pct(m.completionRate)}
                    icon={<CalendarCheck className={ic} />}
                    meter={m.completionRate}
                    formula="Completed ÷ all appointments whose date has passed. Future bookings are excluded so booking ahead cannot depress the rate."
                    href="/dashboard/appointments"
                />
                <StatCard
                    title="Cancellation Rate"
                    value={pct(m.cancellationRate)}
                    icon={<CalendarX className={ic} />}
                    meter={m.cancellationRate}
                    tone={(m.cancellationRate ?? 0) >= 20 ? 'warning' : 'neutral'}
                    formula="Cancelled ÷ all appointments ever booked"
                    href="/dashboard/appointments"
                />
                <StatCard
                    title="Not Closed Out"
                    value={m.overdueAppointments.toLocaleString()}
                    icon={<AlertTriangle className={ic} />}
                    description="Date passed, still marked Scheduled"
                    tone={countTone(m.overdueAppointments, 1, 20)}
                    formula="These are either no-shows or visits nobody marked Completed. Both need a decision."
                    href="/dashboard/appointments"
                />
                <StatCard
                    title="Visits per Day"
                    value={m.avgVisitsPerDay.toString()}
                    icon={<ArrowDownWideNarrow className={ic} />}
                    description="Completed, 30-day average"
                />
                <StatCard
                    title="Waiting Now"
                    value={m.waitlistWaiting.toLocaleString()}
                    icon={<Clock className={ic} />}
                    tone={countTone(m.waitlistWaiting, 5, 15)}
                    href="/dashboard/waitlist"
                />
            </Section>

            <Section title="Clinical Activity" hint="Documentation and case mix">
                <StatCard
                    title="Encounters (30d)"
                    value={m.encounters30d.toLocaleString()}
                    icon={<ClipboardList className={ic} />}
                    trend={m.encountersTrend !== undefined
                        ? { value: m.encountersTrend, label: 'vs prev 30d' }
                        : undefined}
                    href="/dashboard/encounters"
                />
                <StatCard
                    title="Unsigned Notes"
                    value={m.draftNotes.toLocaleString()}
                    icon={<FileWarning className={ic} />}
                    description="Drafts never finalized"
                    tone={countTone(m.draftNotes, 1, 10)}
                    formula="A draft encounter is not a legal record. These are the notes a clinician still owes."
                    href="/dashboard/encounters"
                />
                <StatCard
                    title="Documentation Rate"
                    value={pct(m.documentationRate)}
                    icon={<ClipboardList className={ic} />}
                    meter={m.documentationRate}
                    formula="Finalized ÷ all encounters"
                    href="/dashboard/encounters"
                />
                <StatCard
                    title="Emergencies (30d)"
                    value={m.emergencyEncounters30d.toLocaleString()}
                    icon={<Siren className={ic} />}
                    description="Encounters typed Emergency"
                    href="/dashboard/encounters"
                />
                <StatCard
                    title="Notes per Doctor"
                    value={m.encountersPerDoctor?.toString() ?? '—'}
                    icon={<Stethoscope className={ic} />}
                    description={m.encountersPerDoctor === undefined ? 'No doctors on staff yet' : 'All time, per doctor'}
                />
                <StatCard
                    title="Leading Diagnosis"
                    value={m.topDiagnosis?.label ?? '—'}
                    icon={<Activity className={ic} />}
                    description={m.topDiagnosis
                        ? `${m.topDiagnosis.count} recorded case${m.topDiagnosis.count === 1 ? '' : 's'}`
                        : 'No diagnoses recorded yet'}
                    href="/dashboard/reports"
                />
            </Section>

            <Section title="Pharmacy & Laboratory">
                <StatCard
                    title="Scripts to Dispense"
                    value={m.pendingPrescriptions.toLocaleString()}
                    icon={<Pill className={ic} />}
                    tone={countTone(m.pendingPrescriptions, 1, 15)}
                    href="/dashboard/pharmacy"
                />
                <StatCard
                    title="Dispense Rate"
                    value={pct(m.dispenseRate)}
                    icon={<Pill className={ic} />}
                    meter={m.dispenseRate}
                    formula="Dispensed ÷ prescriptions not cancelled. Cancelled scripts are excluded from both sides."
                    href="/dashboard/pharmacy"
                />
                <StatCard
                    title="Labs Outstanding"
                    value={m.pendingLabs.toLocaleString()}
                    icon={<FlaskConical className={ic} />}
                    description="Pending or in progress"
                    tone={countTone(m.pendingLabs, 1, 20)}
                    href="/dashboard/lab"
                />
                <StatCard
                    title="Urgent Labs Open"
                    value={m.urgentLabs.toLocaleString()}
                    icon={<Siren className={ic} />}
                    description="Urgent or emergency priority"
                    tone={m.urgentLabs > 0 ? 'critical' : 'neutral'}
                    href="/dashboard/lab"
                />
            </Section>

            <Section title="Inpatient">
                <StatCard
                    title="Current Inpatients"
                    value={m.currentInpatients.toLocaleString()}
                    icon={<BedIcon className={ic} />}
                    href="/dashboard/wards"
                />
                <StatCard
                    title="Bed Occupancy"
                    value={pct(m.bedOccupancy)}
                    icon={<BedIcon className={ic} />}
                    meter={m.bedOccupancy}
                    tone={(m.bedOccupancy ?? 0) >= 90 ? 'critical' : (m.bedOccupancy ?? 0) >= 75 ? 'warning' : 'neutral'}
                    formula="Occupied ÷ beds not under maintenance"
                    description={m.bedOccupancy === undefined ? 'No beds configured' : undefined}
                    href="/dashboard/wards"
                />
                <StatCard
                    title="Avg Length of Stay"
                    value={m.avgLengthOfStay === undefined ? '—' : `${m.avgLengthOfStay} days`}
                    icon={<Timer className={ic} />}
                    description={m.avgLengthOfStay === undefined ? 'No discharges recorded yet' : 'Discharged admissions'}
                    href="/dashboard/wards"
                />
                <StatCard
                    title="Waiting for a Bed"
                    value={m.waitlistWaiting.toLocaleString()}
                    icon={<Hourglass className={ic} />}
                    href="/dashboard/waitlist"
                />
            </Section>

            <Section title="Revenue" hint="Paid invoices only">
                <StatCard
                    title="Total Collected"
                    value={naira(m.totalRevenue)}
                    icon={<BadgeDollarSign className={ic} />}
                    formula="Sum of invoices marked paid"
                    href="/dashboard/reports"
                />
                <StatCard
                    title="Collected (30d)"
                    value={naira(m.revenue30d)}
                    icon={<PiggyBank className={ic} />}
                    trend={m.revenueTrend !== undefined
                        ? { value: m.revenueTrend, label: 'vs prev 30d' }
                        : undefined}
                    href="/dashboard/reports"
                />
                <StatCard
                    title="Outstanding"
                    value={naira(m.outstandingAmount)}
                    icon={<Receipt className={ic} />}
                    description="Invoices not yet paid"
                    tone={m.outstandingAmount > 0 ? 'warning' : 'neutral'}
                    href="/dashboard/billing"
                />
                <StatCard
                    title="Collection Rate"
                    value={pct(m.collectionRate)}
                    icon={<BadgeDollarSign className={ic} />}
                    meter={m.collectionRate}
                    tone={(m.collectionRate ?? 100) < 70 ? 'warning' : 'neutral'}
                    formula="Paid ÷ total billed, by amount"
                    href="/dashboard/billing"
                />
            </Section>

            <Section title="Stock & Team">
                <StatCard
                    title="Low Stock"
                    value={m.lowStockItems.toLocaleString()}
                    icon={<Package className={ic} />}
                    description="At or below reorder level"
                    tone={countTone(m.lowStockItems, 1, 10)}
                    href="/dashboard/inventory"
                />
                <StatCard
                    title="Out of Stock"
                    value={m.outOfStockItems.toLocaleString()}
                    icon={<PackageX className={ic} />}
                    tone={m.outOfStockItems > 0 ? 'critical' : 'neutral'}
                    href="/dashboard/inventory"
                />
                <StatCard
                    title="Expiring in 60 Days"
                    value={m.expiringSoon.toLocaleString()}
                    icon={<AlertTriangle className={ic} />}
                    description="Medications nearing expiry"
                    tone={countTone(m.expiringSoon, 1, 5)}
                    href="/dashboard/pharmacy"
                />
                <StatCard
                    title="Stock Value"
                    value={naira(m.stockValue)}
                    icon={<Package className={ic} />}
                    formula="Sum of stock × unit price across the formulary"
                    href="/dashboard/pharmacy"
                />
                <StatCard
                    title="Active Doctors"
                    value={m.activeDoctors.toLocaleString()}
                    icon={<Stethoscope className={ic} />}
                    href="/dashboard/staff"
                />
                <StatCard
                    title="Total Staff"
                    value={m.totalStaff.toLocaleString()}
                    icon={<Users className={ic} />}
                    href="/dashboard/staff"
                />
            </Section>
        </div>
    );
}
