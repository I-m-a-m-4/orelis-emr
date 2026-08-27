'use client';

import type { Firestore } from 'firebase/firestore';
import type { Encounter, Observation, SOAPNote, UserProfile } from '@/lib/types';
import { persistRecord } from './base';
import {
  logAuditEvent,
  diffFields,
  ENCOUNTER_TRACKED_FIELDS,
  type AuditAction,
} from '@/lib/audit';
import { syncRowToOffline } from '@/lib/offline/mirror';

/**
 * Clinical encounters — the SOAP note, vitals and diagnosis for one visit.
 *
 * This replaces `saveEncounterAction` from `src/app/actions.ts`. It runs on the
 * client for one reason: a consultation is exactly the moment a hospital's
 * internet is least likely to matter and most likely to be absent, so writing a
 * note must not require a round-trip to a server. See `./base.ts` for why none of
 * the Firestore promises are awaited.
 */

export interface SaveEncounterInput {
  /** Omit to create. */
  id?: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  type: Encounter['type'];
  diagnosis?: string;
  soap: SOAPNote;
  vitals?: Observation[];
  status: Encounter['status'];
  prescriptions?: string[];
  labOrders?: string[];
}

export interface SaveResult {
  success: boolean;
  message: string;
  id?: string;
  /** True when the record is local-only so far — shown as "will sync" in the UI. */
  pending?: boolean;
}

type Actor = Pick<UserProfile, 'uid' | 'name' | 'email' | 'role'> & { id?: string };

/**
 * Which audit action a save represents.
 *
 * The distinction between `update` and `amend` is medico-legal, not cosmetic.
 * Editing a draft is ordinary work. Editing a note that was already **finalized**
 * changes the official record of what a clinician observed, and that is the event
 * an investigation asks about — so it gets its own action and carries the original
 * author and timestamp, which the edit itself is about to overwrite.
 */
function auditActionFor(
  previous: Encounter | null | undefined,
  next: SaveEncounterInput
): AuditAction {
  if (!previous) return 'encounter.create';
  if (previous.status === 'Finalized') return 'encounter.amend';
  if (previous.status === 'Draft' && next.status === 'Finalized') {
    return 'encounter.finalize';
  }
  return 'encounter.update';
}

export async function saveEncounter(
  firestore: Firestore,
  actor: Actor,
  input: SaveEncounterInput,
  opts: { previous?: Encounter | null } = {}
): Promise<SaveResult> {
  if (!input.patientId) return { success: false, message: 'A patient is required.' };
  if (!input.clinicId) return { success: false, message: 'A clinic is required.' };
  if (!input.doctorId) return { success: false, message: 'A clinician is required.' };

  const previous = opts.previous ?? null;

  const record = {
    patientId: input.patientId,
    patientName: input.patientName,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    date: input.date,
    type: input.type,
    diagnosis: input.diagnosis ?? '',
    soap: {
      subjective: input.soap?.subjective ?? '',
      objective: input.soap?.objective ?? '',
      assessment: input.soap?.assessment ?? '',
      plan: input.soap?.plan ?? '',
    },
    vitals: input.vitals ?? [],
    status: input.status,
    prescriptions: input.prescriptions ?? [],
    labOrders: input.labOrders ?? [],
  };

  try {
    const { id, mirrored } = await persistRecord({
      firestore,
      collectionName: 'encounters',
      table: 'encounters',
      clinicId: input.clinicId,
      id: input.id ?? null,
      data: record,
    });

    const action = auditActionFor(previous, input);

    void logAuditEvent(firestore, input.clinicId, actor, {
      action,
      entity: { type: 'encounter', id, name: `${input.patientName} — ${input.type}` },
      patientId: input.patientId,
      details: {
        changes: diffFields(
          previous as any,
          record as any,
          ENCOUNTER_TRACKED_FIELDS as unknown as (keyof typeof record)[]
        ),
        // Only meaningful on an amendment, and unrecoverable once the write
        // above lands — so captured here or never.
        ...(action === 'encounter.amend'
          ? {
              originalAuthor: previous?.doctorName,
              originalAuthorId: previous?.doctorId,
              originalCreatedAt: (previous as any)?.createdAt ?? previous?.date,
            }
          : {}),
      },
    });

    // A visit updates the patient's "last seen" date. Mirrored so the patient
    // list offline does not disagree with the chart.
    if (!input.id) {
      void updatePatientLastVisit(firestore, input.clinicId, input.patientId, input.date);
    }

    return {
      success: true,
      message: 'Clinical record saved.',
      id,
      pending: !mirrored,
    };
  } catch (err: any) {
    console.error('Error saving encounter:', err);
    return { success: false, message: `Failed to save record: ${err?.message ?? err}` };
  }
}

/**
 * Bump `lastVisit` on the patient without re-reading the patient document.
 *
 * A merge write avoids the read entirely — which matters because this fires on
 * every consultation, and because offline we may not have the patient document
 * to read in the first place.
 */
async function updatePatientLastVisit(
  firestore: Firestore,
  clinicId: string,
  patientId: string,
  date: string
): Promise<void> {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const ref = doc(firestore, 'patients', patientId);
    void setDoc(
      ref,
      { lastVisit: date, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch((err) => console.error('lastVisit update failed:', err));

    // Patch the mirrored copy too, so an offline patient list shows the visit.
    const { getCachedRow } = await import('@/lib/offline/mirror');
    const cached = await getCachedRow<any>('patients', patientId);
    if (cached) {
      void syncRowToOffline('patients', clinicId, { ...cached, lastVisit: date });
    }
  } catch (err) {
    console.error('lastVisit update failed:', err);
  }
}
