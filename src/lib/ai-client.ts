'use client';

import { apiFetch } from '@/lib/api-client';

/**
 * Client access to the AI gateway (`src/app/api/ai/[flow]/route.ts`).
 *
 * Note `queueOnFailure: false`. Every other mutation in the app is queued for
 * replay after an outage, but an AI call must not be: the clinician has already
 * moved on by the time the network returns, and a suggestion that arrives three
 * hours late — about a patient who has since been discharged — is at best noise
 * and at worst dangerous. AI degrades to "unavailable", never to "eventually".
 *
 * Anything genuinely worth keeping across an outage (a dictated recording waiting
 * to be transcribed) is queued as *data* by its own feature, then submitted here
 * fresh when the connection is back.
 */

export interface AiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the failure was connectivity rather than the model or the server. */
  offline?: boolean;
}

export async function callAiFlow<T = any>(
  flow: string,
  input: unknown,
  opts: { signal?: AbortSignal } = {}
): Promise<AiResult<T>> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    return {
      ok: false,
      offline: true,
      error: 'The assistant needs a connection. Your work is saved and will sync.',
    };
  }

  const res = await apiFetch<{ success: boolean; data: T }>(`/api/ai/${flow}`, {
    method: 'POST',
    body: input,
    queueOnFailure: false,
    signal: opts.signal,
  });

  if (!res.ok) {
    return {
      ok: false,
      // A network-level failure here means the connection dropped between the
      // check above and the request; report it as offline rather than as a
      // model error, so the UI shows the right recovery hint.
      offline: !res.status,
      error: res.error || 'The assistant is unavailable right now.',
    };
  }

  return { ok: true, data: res.data?.data as T };
}

/* ------------------------------------------------------------------ helpers */

export interface SupportChatAnswer {
  answer: string;
}

export function askSupportQuestion(input: {
  question: string;
  history?: any[];
}): Promise<AiResult<SupportChatAnswer>> {
  return callAiFlow<SupportChatAnswer>('support-chat', input);
}

export interface ReminderMessage {
  reminderMessage: string;
}

export function generateAppointmentReminder(input: {
  patientName: string;
  appointmentTime: string;
  doctorName: string;
  hospitalName?: string;
}): Promise<AiResult<ReminderMessage>> {
  return callAiFlow<ReminderMessage>('appointment-reminder', {
    hospitalName: 'Orelis Clinic',
    ...input,
  });
}
