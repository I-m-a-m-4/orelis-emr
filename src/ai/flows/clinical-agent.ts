'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import type { AuthedCaller } from '@/lib/server/api-auth';
import { generatePatientCode } from '@/lib/utils';
import { Resend } from 'resend';

// Safety fence context that will be appended to every tool call run
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const ClinicalAgentInputSchema = z.object({
  question: z.string().describe("The user's query or command for the agent."),
  history: z.array(z.any()).optional().describe("The chat history."),
});
export type ClinicalAgentInput = z.infer<typeof ClinicalAgentInputSchema>;

export const ClinicalAgentOutputSchema = z.object({
  answer: z.string(),
});
export type ClinicalAgentOutput = z.infer<typeof ClinicalAgentOutputSchema>;

// Initialize db access
async function getDb() {
  const app = await initializeAdminApp();
  return getFirestore(app);
}

// ==========================================
// TOOLS - READ ONLY
// ==========================================

const listPatients = ai.defineTool(
  {
    name: 'listPatients',
    description: 'List patients in the clinic. Returns basic demographics.',
    inputSchema: z.object({
      limit: z.number().optional().default(10),
    }),
    outputSchema: z.any(),
  },
  async ({ limit }, { context }) => {
    const caller = context as AuthedCaller;
    if (!caller.clinicId) throw new Error("No clinic ID");
    const db = await getDb();
    const snap = await db.collection('patients')
      .where('clinicId', '==', caller.clinicId)
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
);

const searchPatients = ai.defineTool(
  {
    name: 'searchPatients',
    description: 'Search for a patient by first name or surname.',
    inputSchema: z.object({
      nameQuery: z.string(),
    }),
    outputSchema: z.any(),
  },
  async ({ nameQuery }, { context }) => {
    const caller = context as AuthedCaller;
    if (!caller.clinicId) throw new Error("No clinic ID");
    const db = await getDb();
    // A simple client-side filter on the server for demo since firestore text search is limited
    const snap = await db.collection('patients')
      .where('clinicId', '==', caller.clinicId)
      .get();
    
    const query = nameQuery.toLowerCase();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(p => p.firstName?.toLowerCase().includes(query) || p.surname?.toLowerCase().includes(query))
      .slice(0, 10);
  }
);

const listTodayAppointments = ai.defineTool(
  {
    name: 'listTodayAppointments',
    description: 'List appointments scheduled for today.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async (_, { context }) => {
    const caller = context as AuthedCaller;
    if (!caller.clinicId) throw new Error("No clinic ID");
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];
    const snap = await db.collection('appointments')
      .where('clinicId', '==', caller.clinicId)
      .where('appointmentDate', '>=', today)
      .where('appointmentDate', '<', today + 'T23:59:59')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
);

// ==========================================
// TOOLS - WRITES (No Deletes)
// ==========================================

const createDraftEncounter = ai.defineTool(
  {
    name: 'createDraftEncounter',
    description: 'Creates a draft encounter/SOAP note for a patient.',
    inputSchema: z.object({
      patientId: z.string(),
      patientName: z.string(),
      reason: z.string().optional(),
    }),
    outputSchema: z.any(),
  },
  async ({ patientId, patientName, reason }, { context }) => {
    const caller = context as AuthedCaller;
    if (!caller.clinicId) throw new Error("No clinic ID");
    const db = await getDb();
    const ref = db.collection('encounters').doc();
    const now = new Date().toISOString();
    const data = {
      clinicId: caller.clinicId,
      patientId,
      patientName,
      doctorId: caller.uid,
      doctorName: caller.email,
      date: now,
      type: 'Consultation',
      status: 'Draft',
      soap: {
        subjective: reason || '',
        objective: '',
        assessment: '',
        plan: ''
      },
      createdAt: now,
      updatedAt: now
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }
);

const sendPatientEmail = ai.defineTool(
  {
    name: 'sendPatientEmail',
    description: 'Send an email to a patient with a portal link or custom message.',
    inputSchema: z.object({
      to: z.string(),
      subject: z.string(),
      content: z.string(),
    }),
    outputSchema: z.any(),
  },
  async ({ to, subject, content }, { context }) => {
    if (!resend) {
        return { success: false, error: 'Resend API key not configured on server' };
    }
    try {
        const data = await resend.emails.send({
            from: 'Orelis Clinic <onboarding@resend.dev>',
            to,
            subject,
            html: `<div style="font-family: sans-serif; padding: 20px;">${content}</div>`,
        });
        return { success: true, messageId: data.data?.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  }
);

const generatePatientPortalLink = ai.defineTool(
  {
    name: 'generatePatientPortalLink',
    description: 'Generates a WhatsApp-ready deep link to send to a patient for their portal access.',
    inputSchema: z.object({
      patientCode: z.string(),
      phone: z.string().optional(),
    }),
    outputSchema: z.any(),
  },
  async ({ patientCode, phone }) => {
    const url = `https://orelis-med.vercel.app/login`;
    const message = `Hello, access your Orelis patient portal using this code: ${patientCode} at ${url}`;
    const encoded = encodeURIComponent(message);
    const waLink = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    return { waLink, message };
  }
);


// ==========================================
// AGENT FLOW
// ==========================================

const SYSTEM_PROMPT = `
You are the Orelis Clinical Agent, a highly capable and intelligent AI assistant designed to help doctors and medical staff manage their clinic.
You have access to a suite of tools to read and write clinical data (Patients, Appointments, Encounters, etc).

CRITICAL SAFETY RULES:
1. YOU MUST NEVER DELETE ANY DATA.
2. YOU CANNOT CHANGE A PATIENT'S MEDICAL HISTORY WITHOUT EXPLICIT PERMISSION.
3. ALWAYS BE POLITE, PROFESSIONAL, AND CONCISE.
4. ONLY PROVIDE MEDICAL ADVICE IF ASKED, AND ALWAYS CAVEAT IT AS AN AI ASSISTANT.

Use markdown for formatting. Keep your responses brief.
If you use a tool, explain briefly what you did (e.g. "I have created a draft encounter for Amara Okafor.").
`;

export async function runClinicalAgent(input: ClinicalAgentInput, caller: AuthedCaller): Promise<ClinicalAgentOutput> {
  const messages: any[] = (input.history || []).map((m: any) => ({
    role: m.role,
    content: [{ text: m.content }]
  }));

  messages.push({
    role: 'user',
    content: [{ text: input.question }]
  });

  const result = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system: SYSTEM_PROMPT,
    messages: messages,
    tools: [
        listPatients, 
        searchPatients, 
        listTodayAppointments, 
        createDraftEncounter, 
        sendPatientEmail, 
        generatePatientPortalLink
    ],
    context: caller,
  });

  return {
    answer: result.text,
  };
}
