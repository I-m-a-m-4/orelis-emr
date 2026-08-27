'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { syncRowToOffline } from '@/lib/offline/mirror';

/**
 * The clinical audit trail.
 *
 * An EMR's audit log is not a debugging aid — it is the record a hospital
 * produces when someone asks who altered a diagnosis, who read a colleague's
 * chart, or which pharmacist dispensed a controlled drug. Two consequences shape
 * this file:
 *
 * 1. **`patient.view` is an audited event.** Retail software logs writes; clinical
 *    software must log *reads*, because inappropriate access to a record is the
 *    most common privacy breach in a hospital and it leaves no other trace.
 *
 * 2. **Several details can only be captured at the moment of the action.** An
 *    amendment overwrites what it amends, so `changes` and `originalAuthor` are
 *    the only surviving evidence of what a note used to say — and no later
 *    migration can reconstruct them. They are written even though nothing
 *    displays them yet. Removing one silently destroys the ability to answer a
 *    medico-legal question later.
 */

export type AuditAction =
  // Reads worth recording. `patient.view` is the access log.
  | 'patient.view'
  | 'record.export'
  | 'record.print'
  // Patients
  | 'patient.create' | 'patient.update' | 'patient.delete' | 'patient.merge'
  // Clinical encounters. `amend` is distinct from `update` on purpose (below).
  | 'encounter.create' | 'encounter.update' | 'encounter.finalize' | 'encounter.amend'
  // Orders and results
  | 'prescription.create' | 'prescription.dispense' | 'prescription.cancel'
  | 'lab.order' | 'lab.result' | 'lab.cancel'
  // Movement
  | 'appointment.create' | 'appointment.update' | 'appointment.cancel'
  | 'admission.admit' | 'admission.discharge' | 'admission.transfer'
  // Stock
  | 'medication.create' | 'medication.update' | 'medication.stock_adjustment'
  // People
  | 'user.invite' | 'user.update_role' | 'user.update_status'
  | 'auth.login' | 'auth.logout'
  // Money and configuration
  | 'settings.update'
  | 'billing.invoice_create' | 'billing.payment' | 'billing.assign_plan';

/**
 * Details that make an event *answerable* rather than merely recorded.
 *
 * Every field here is one that cannot be reconstructed after the fact.
 */
export interface AuditForensicDetails {
  /**
   * Field → before/after, for the fields that carry clinical or financial
   * weight. On an amendment this is the only surviving copy of the old value.
   */
  changes?: Record<string, { from: any; to: any }>;
  /**
   * Amendments and cancellations: who wrote the thing being changed, and when.
   *
   * A clinician correcting their own note ten minutes later and a different
   * clinician altering it three weeks later are the same `encounter.amend`
   * without these two fields, and only one of them is a concern.
   */
  originalAuthor?: string;
  originalAuthorId?: string;
  originalCreatedAt?: string;
  /** Dispensing: what the system still believed was on the shelf. */
  stockAtDispense?: number;
  /** Deletions: the record's state at the moment it was removed. */
  snapshotAtDeletion?: Record<string, any>;
  /** Exports/prints: how many records left the building, and in what form. */
  recordCount?: number;
  exportFormat?: string;
  /** Why the actor says they opened a record they do not normally treat. */
  accessReason?: string;
}

export interface AuditEvent {
  action: AuditAction;
  entity: {
    type: string;
    id: string;
    name?: string;
  };
  /** The patient this event concerns, when it is not the entity itself. */
  patientId?: string;
  details?: Record<string, any> & AuditForensicDetails;
}

/**
 * The Firestore collection and the local mirror table.
 *
 * `audit_logs`, not `auditLogs`. Both names existed briefly: the shipped app has
 * always written and read `audit_logs` (see the activity trail in
 * dashboard/settings), while this module and the admin API routes were drafted
 * against `auditLogs`. Two collections means the trail silently splits in half —
 * and the half a hospital would be asked to produce is whichever one it is not
 * looking at. Consolidated here on the deployed name; the drafted one never
 * shipped, so nothing is orphaned.
 */
export const AUDIT_COLLECTION = 'audit_logs';

/**
 * Render an event as one line of prose.
 *
 * The existing activity trail renders `details` straight into a table cell, and
 * the records it was written for carry a string there. Structured `details` is
 * strictly better for forensics but is an object, and an object rendered as a
 * React child throws. So both are written: `details` stays structured, `summary`
 * carries the human line, and readers prefer `summary` and fall back to a
 * string `details` for the historical rows.
 */
function summarise(
  event: AuditEvent,
  user: { name?: string; role?: string }
): string {
  const who = user?.name || 'Someone';
  const what = event.entity.name || event.entity.id;
  const verb = event.action.replace(/\./g, ' ').replace(/_/g, ' ');
  return `${who} (${user?.role || 'unknown role'}) — ${verb}${what ? `: ${what}` : ''}`;
}

/**
 * Append one event.
 *
 * Deliberately fire-and-forget: an audit write must never block or fail a
 * clinical action. A doctor mid-consultation cannot be stopped because a log
 * append timed out — so this catches everything, and the local mirror below
 * means an event recorded offline still reaches the server later via Firestore's
 * own write queue.
 *
 * The caller does not await it. It is `async` only so the internals can be.
 */
export async function logAuditEvent(
  firestore: Firestore,
  clinicId: string,
  user: Pick<UserProfile, 'uid' | 'name' | 'email' | 'role'> & { id?: string },
  event: AuditEvent
): Promise<void> {
  try {
    const details: Record<string, any> = {
      entityName: event.entity.name ?? null,
      ...event.details,
    };
    // Firestore rejects undefined values outright.
    Object.keys(details).forEach(
      (k) => details[k] === undefined && delete details[k]
    );

    const clientCreatedAt = new Date().toISOString();

    const logData = {
      clinicId,
      userId: user?.uid || user?.id || 'unknown',
      userName: user?.name || 'Unknown User',
      userEmail: user?.email || 'N/A',
      /**
       * The actor's role *at the time of the action*.
       *
       * Roles change. Reading today's role off the user document when the log is
       * later displayed would show a receptionist who was promoted as having
       * acted as an admin two years ago, and vice versa.
       */
      userRole: user?.role || 'unknown',
      action: event.action,
      entityType: event.entity.type,
      entityId: event.entity.id,
      patientId: event.patientId ?? null,
      details,
      summary: summarise(event, user ?? {}),
      /**
       * Two times on purpose.
       *
       * `createdAt` is server-authoritative and is what an investigation trusts —
       * a client clock can be wrong or deliberately set back. But it is null
       * until the write lands, so an event logged offline sorts to the epoch and
       * an ordered query drops it off the end. `timestamp` is the client's ISO
       * string, is never null, and is what every existing query orders by.
       */
      createdAt: serverTimestamp(),
      timestamp: clientCreatedAt,
      clientCreatedAt,
    };

    const ref = await addDoc(collection(firestore, AUDIT_COLLECTION), logData);

    // Mirror so the admin console's activity feed works offline too.
    void syncRowToOffline('audit_logs', clinicId, {
      id: ref.id,
      ...logData,
      createdAt: clientCreatedAt,
    });
  } catch (error) {
    // Never rethrow. Losing a log line is bad; losing the clinical action it
    // describes is worse.
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Build a `changes` map from a before/after pair, limited to fields worth
 * tracking.
 *
 * Diffing the whole document would bury the two fields that matter under thirty
 * that did not change, so callers name the fields they care about. Values are
 * compared by JSON so nested objects (`nextOfKin`, a vitals array) work.
 */
export function diffFields<T extends Record<string, any>>(
  before: T | null | undefined,
  after: T,
  fields: (keyof T)[]
): Record<string, { from: any; to: any }> | undefined {
  if (!before) return undefined;

  const changes: Record<string, { from: any; to: any }> = {};
  for (const field of fields) {
    const from = before[field];
    const to = after[field];
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) {
      changes[String(field)] = { from: from ?? null, to: to ?? null };
    }
  }
  return Object.keys(changes).length ? changes : undefined;
}

/** Fields on a patient record whose change is worth recording. */
export const PATIENT_TRACKED_FIELDS = [
  'surname',
  'firstName',
  'dob',
  'sex',
  'phone',
  'email',
  'address',
  'nextOfKin',
  'allergies',
  'notes',
  'status',
] as const;

/** Fields on an encounter whose change is a clinical amendment. */
export const ENCOUNTER_TRACKED_FIELDS = [
  'diagnosis',
  'soap',
  'vitals',
  'type',
  'status',
  'prescriptions',
  'labOrders',
] as const;
