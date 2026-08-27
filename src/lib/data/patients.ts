'use client';

import type { Firestore } from 'firebase/firestore';
import type { Patient, UserProfile } from '@/lib/types';
import { persistRecord } from './base';
import {
  logAuditEvent,
  diffFields,
  PATIENT_TRACKED_FIELDS,
} from '@/lib/audit';
import type { SaveResult } from './encounters';
import { generatePatientCode } from '@/lib/utils';

/**
 * Patient demographics.
 *
 * Replaces `updatePatientAction` from `src/app/actions.ts`. Creation and edits
 * run on the client so a receptionist can register a walk-in during an outage;
 * **deletion does not** — a patient delete cascades across appointments,
 * encounters, invoices and an Auth account, and a cascade half-applied because a
 * tab closed is worse than one that waits for a connection. That lives behind
 * `/api/admin/cascade-delete`.
 */

type Actor = Pick<UserProfile, 'uid' | 'name' | 'email' | 'role'> & { id?: string };

export interface PatientInput {
  clinicId: string;
  firstName: string;
  surname: string;
  dob?: string;
  sex: Patient['sex'];
  maritalStatus?: Patient['maritalStatus'];
  address?: string;
  phone: string;
  email?: string;
  occupation?: string;
  origin?: string;
  tribe?: string;
  religion?: string;
  notes?: string;
  country?: string;
  patientCode?: string;
  nextOfKin?: {
    name?: string;
    relation?: string;
    phone?: string;
    address?: string;
  };
  allergies?: any[];
  immunizations?: any[];
  planOfCare?: any[];
  status?: Patient['status'];
}

function validate(input: PatientInput): string | null {
  if (!input.clinicId) return 'A clinic is required.';
  if (!input.firstName?.trim()) return 'First name is required.';
  if (!input.surname?.trim()) return 'Surname is required.';
  if (!input.phone?.trim()) return 'Phone number is required.';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return 'Invalid email address.';
  }
  return null;
}

/**
 * A short human-usable code the patient quotes to link their portal account.
 *
 * Reuses `generatePatientCode` from `@/lib/utils`, whose alphabet deliberately
 * omits I, O, 0 and 1 — this code gets read down a phone line and written on
 * paper, so visually ambiguous characters cause real mis-links.
 *
 * Generated client-side so registration works offline. Collisions are possible in
 * principle; the portal link flow matches on code **and** surname, so a collision
 * cannot expose the wrong record.
 */

function toRecord(input: PatientInput) {
  return {
    firstName: input.firstName.trim(),
    surname: input.surname.trim(),
    dob: input.dob ?? '',
    sex: input.sex,
    maritalStatus: input.maritalStatus ?? 'Single',
    address: input.address ?? '',
    phone: input.phone.trim(),
    email: input.email ?? '',
    occupation: input.occupation ?? '',
    origin: input.origin ?? '',
    tribe: input.tribe ?? '',
    religion: input.religion ?? '',
    notes: input.notes ?? '',
    country: input.country ?? '',
    nextOfKin: {
      name: input.nextOfKin?.name ?? '',
      relation: input.nextOfKin?.relation ?? '',
      phone: input.nextOfKin?.phone ?? '',
      address: input.nextOfKin?.address ?? '',
    },
    allergies: input.allergies ?? [],
    immunizations: input.immunizations ?? [],
    planOfCare: input.planOfCare ?? [],
    status: input.status ?? 'Active',
  };
}

export async function createPatient(
  firestore: Firestore,
  actor: Actor,
  input: PatientInput
): Promise<SaveResult> {
  const invalid = validate(input);
  if (invalid) return { success: false, message: invalid };

  const record = {
    ...toRecord(input),
    patientCode: input.patientCode || generatePatientCode(),
    registrationDate: new Date().toISOString(),
  };

  try {
    const { id, mirrored } = await persistRecord({
      firestore,
      collectionName: 'patients',
      table: 'patients',
      clinicId: input.clinicId,
      data: record,
    });

    void logAuditEvent(firestore, input.clinicId, actor, {
      action: 'patient.create',
      entity: {
        type: 'patient',
        id,
        name: `${record.firstName} ${record.surname}`,
      },
      patientId: id,
    });

    return {
      success: true,
      message: 'Patient registered.',
      id,
      pending: !mirrored,
    };
  } catch (err: any) {
    console.error('Error creating patient:', err);
    return { success: false, message: `Failed to register patient: ${err?.message ?? err}` };
  }
}

export async function updatePatient(
  firestore: Firestore,
  actor: Actor,
  patientId: string,
  input: PatientInput,
  opts: { previous?: Patient | null } = {}
): Promise<SaveResult> {
  if (!patientId) return { success: false, message: 'A patient id is required.' };
  const invalid = validate(input);
  if (invalid) return { success: false, message: invalid };

  const record = toRecord(input);
  if (input.patientCode) (record as any).patientCode = input.patientCode;

  try {
    const { id, mirrored } = await persistRecord({
      firestore,
      collectionName: 'patients',
      table: 'patients',
      clinicId: input.clinicId,
      id: patientId,
      data: record,
      // Merge so fields this form does not carry — `lastVisit`, and any custom
      // field a clinic added — are not wiped by an edit that never saw them.
      merge: true,
    });

    void logAuditEvent(firestore, input.clinicId, actor, {
      action: 'patient.update',
      entity: {
        type: 'patient',
        id,
        name: `${record.firstName} ${record.surname}`,
      },
      patientId: id,
      details: {
        changes: diffFields(
          opts.previous as any,
          record as any,
          PATIENT_TRACKED_FIELDS as unknown as (keyof typeof record)[]
        ),
      },
    });

    return {
      success: true,
      message: 'Patient details updated.',
      id,
      pending: !mirrored,
    };
  } catch (err: any) {
    console.error('Error updating patient:', err);
    return { success: false, message: `Failed to update patient: ${err?.message ?? err}` };
  }
}

/**
 * Record that someone opened a patient's chart.
 *
 * This is the access log, and it is the audit event a privacy investigation
 * actually asks for — an inappropriate *read* leaves no other trace anywhere in
 * the system.
 *
 * Deliberately throttled per session: the chart screen remounts on every tab
 * change, and one row per remount would bury a genuinely suspicious pattern of
 * access under thousands of duplicates from ordinary navigation. One event per
 * user-per-patient per `THROTTLE_MS` is enough to answer "who looked at this
 * record today" while still showing repeated visits over time.
 */
const VIEW_THROTTLE_MS = 15 * 60 * 1000;
const recentViews = new Map<string, number>();

export function logPatientAccess(
  firestore: Firestore,
  clinicId: string,
  actor: Actor,
  patient: { id: string; firstName?: string; surname?: string },
  details?: { accessReason?: string }
): void {
  if (!clinicId || !patient?.id) return;

  const key = `${actor?.uid ?? actor?.id ?? 'unknown'}:${patient.id}`;
  const last = recentViews.get(key) ?? 0;
  const now = Date.now();
  if (now - last < VIEW_THROTTLE_MS) return;
  recentViews.set(key, now);

  void logAuditEvent(firestore, clinicId, actor, {
    action: 'patient.view',
    entity: {
      type: 'patient',
      id: patient.id,
      name: [patient.firstName, patient.surname].filter(Boolean).join(' ') || undefined,
    },
    patientId: patient.id,
    details,
  });
}
