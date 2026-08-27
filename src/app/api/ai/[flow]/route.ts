import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { requireAuth, type AuthedCaller } from '@/lib/server/api-auth';
import type { UserRole } from '@/lib/types';

/**
 * The AI gateway.
 *
 * Genkit needs a server: it holds the Gemini credential and must never run in a
 * client bundle. The native builds are a static export with no server of their
 * own, so they reach these flows over HTTP at `apiBase()` (see
 * `src/lib/platform.ts`).
 *
 * One route with a registry rather than a file per flow, because every flow needs
 * the same four things — token check, role floor, usage accounting, uniform error
 * shape — and duplicating those across a dozen routes is how one of them ends up
 * missing the role check.
 *
 * Flows are imported lazily inside each handler. A top-level import would pull
 * every flow (and the whole Genkit runtime) into this route's bundle even when a
 * request only needs one.
 */

interface FlowDef {
  /** Minimum role. Clinical flows must not be reachable by a patient account. */
  minRole: UserRole | 'super-admin';
  run: (input: any, caller: AuthedCaller) => Promise<any>;
}

const FLOWS: Record<string, FlowDef> = {
  'support-chat': {
    // Any signed-in user, including patients using the portal.
    minRole: 'patient',
    run: async (input) => {
      const { answerQuestion } = await import('@/ai/flows/support-chat');
      return answerQuestion({
        question: String(input?.question ?? ''),
        history: Array.isArray(input?.history) ? input.history : undefined,
      });
    },
  },

  'appointment-reminder': {
    minRole: 'receptionist',
    run: async (input) => {
      const { generateAppointmentReminder } = await import(
        '@/ai/flows/appointment-reminders'
      );
      return generateAppointmentReminder({
        patientName: String(input?.patientName ?? ''),
        appointmentTime: String(input?.appointmentTime ?? ''),
        doctorName: String(input?.doctorName ?? ''),
        hospitalName: String(input?.hospitalName ?? 'Orelis Clinic'),
      });
    },
  },
};

/**
 * Record what the flow cost, for the admin console's AI usage panel.
 *
 * Fire-and-forget and never fatal: a failed usage write must not turn a
 * successful clinical suggestion into an error the clinician sees.
 */
async function recordUsage(
  caller: AuthedCaller,
  flow: string,
  outcome: 'ok' | 'error',
  ms: number
): Promise<void> {
  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    await db.collection('aiUsage').add({
      clinicId: caller.clinicId ?? null,
      userId: caller.uid,
      flow,
      outcome,
      durationMs: ms,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI usage record failed:', err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ flow: string }> }
) {
  const { flow } = await params;
  const def = FLOWS[flow];

  if (!def) {
    return NextResponse.json({ error: `Unknown AI flow: ${flow}` }, { status: 404 });
  }

  const auth = await requireAuth(req, def.minRole);
  if (!auth.ok) return auth.response;

  let input: any;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const started = Date.now();
  try {
    const data = await def.run(input, auth.caller);
    void recordUsage(auth.caller, flow, 'ok', Date.now() - started);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    void recordUsage(auth.caller, flow, 'error', Date.now() - started);
    console.error(`AI flow '${flow}' failed:`, err);
    return NextResponse.json(
      {
        error:
          // Model errors are frequently quota or safety related, and the raw
          // message is unhelpful to a clinician — but keep it in the log above.
          'The assistant could not complete that request. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? String(err?.message ?? err) : undefined,
      },
      { status: 502 }
    );
  }
}
