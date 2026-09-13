/**
 * @fileOverview Groq AI Client for Clinical Audio Transcription & Medical Scribe Structuring.
 *
 * Utilizes Groq's low-latency LPUs:
 * - Whisper (`whisper-large-v3-turbo`): Fast and accurate speech-to-text for clinical consultations.
 * - Clinical LLM (`qwen/qwen3.8-27b` / `openai/gpt-oss-120b`): Structures SOAP notes, extracts
 *   vitals, prescriptions, labs, and flags clinical oversight items for doctor verification.
 */

export interface GroqVitals {
  bpSys?: string;
  bpDia?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  weight?: string;
  respRate?: string;
}

export interface GroqPrescription {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface GroqClinicalScribeOutput {
  verbatimTranscript: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint?: string;
  vitals?: GroqVitals;
  prescriptions: string[];
  structuredPrescriptions?: GroqPrescription[];
  labs: string[];
  uncertainties: string[];
  clinicalOversight: string[];
}

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is not configured in server environment variables.');
  }
  return key;
}

/**
 * Transcribes audio via Groq Whisper API.
 * Supports data URLs (`data:audio/webm;base64,...`) and raw Buffers.
 */
export async function transcribeAudioWithGroq(
  audioDataUrlOrBuffer: string | Buffer,
  mimeType = 'audio/webm'
): Promise<string> {
  const apiKey = getGroqApiKey();

  let buffer: Buffer;
  let fileExt = 'webm';

  if (typeof audioDataUrlOrBuffer === 'string') {
    if (audioDataUrlOrBuffer.startsWith('data:')) {
      const match = audioDataUrlOrBuffer.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid audio data URL format.');
      }
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      // Raw base64 string
      buffer = Buffer.from(audioDataUrlOrBuffer, 'base64');
    }
  } else {
    buffer = audioDataUrlOrBuffer;
  }

  if (mimeType.includes('mp4')) fileExt = 'mp4';
  else if (mimeType.includes('wav')) fileExt = 'wav';
  else if (mimeType.includes('ogg')) fileExt = 'ogg';
  else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) fileExt = 'mp3';

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, `consultation-recording.${fileExt}`);
  // Whisper large v3 turbo gives state of the art accuracy with sub-second latency on Groq
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');
  formData.append('temperature', '0');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`Groq Whisper transcription failed (${res.status}):`, errText);

    // If turbo fails or rate-limited, attempt fallback to whisper-large-v3
    if (res.status === 404 || res.status === 400) {
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', new Blob([buffer], { type: mimeType }), `consultation-recording.${fileExt}`);
      fallbackFormData.append('model', 'whisper-large-v3');
      fallbackFormData.append('response_format', 'json');

      const fallbackRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fallbackFormData,
      });

      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        return String(data?.text ?? '').trim();
      }
    }

    throw new Error(`Groq speech transcription failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return String(data?.text ?? '').trim();
}

/**
 * Structures clinical consultation transcript into an Electronic Medical Record
 * SOAP note with extracted vitals, prescriptions, and safety oversight flags.
 */
export async function structureClinicalNoteWithGroq(
  transcript: string,
  context?: string
): Promise<GroqClinicalScribeOutput> {
  const apiKey = getGroqApiKey();

  if (!transcript || !transcript.trim()) {
    return {
      verbatimTranscript: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      prescriptions: [],
      labs: [],
      uncertainties: ['No audible conversation detected.'],
      clinicalOversight: ['Empty recording — no clinical data was transcribed.'],
    };
  }

  const systemPrompt = `You are an elite, highly meticulous AI Clinical Medical Scribe and Clinical Safety Specialist for the Orelis Electronic Medical Record (EMR) system.
Your job is to convert a verbatim doctor-patient consultation transcript into a professional, structured clinical SOAP record.

ABSOLUTE MEDICAL SCRIBING DIRECTIVES:
1. TRUTHFULNESS & NON-FABRICATION:
   - Document ONLY facts, symptoms, vitals, exam findings, diagnoses, and orders that were genuinely expressed in the conversation.
   - If a clinical field was not mentioned (e.g. no physical exam or no blood pressure taken), leave that field completely empty or state that it was not documented. NEVER invent plausible vitals or findings.
2. DOCTOR OVERSIGHT & CLINICAL SAFETY FLAGS:
   - Identify every uncertainty, unclear dosage, ambiguous drug name, or spoken vital sign requiring clinician verification.
   - Place specific confirmation items in "uncertainties" (e.g. "Confirm if dosage was 500mg or 250mg", "Clarify whether patient has penicillin allergy").
   - Place clinical oversight reminders in "clinicalOversight" (e.g. "Diagnosis of acute migraine made without formal neurological screening documented", "High BP (150/95) spoken during consultation").
3. VITALS EXTRACTION:
   - If blood pressure, pulse, temperature, SpO2, respiratory rate, or weight were stated in the consultation, extract them into the "vitals" object with keys: bpSys, bpDia, pulse, temp, spo2, weight, respRate.
4. PRESCRIPTIONS & LABS:
   - For "prescriptions", list each medication exactly as spoken (name, dose, frequency, duration).
   - Also provide "structuredPrescriptions": array of { name, dosage, frequency, duration, instructions }.
   - For "labs", list any blood tests, urinalysis, imaging, or pathology ordered.

OUTPUT FORMAT:
You must respond with a strictly valid JSON object matching this schema:
{
  "verbatimTranscript": "Exact transcript string with speaker labels if discernable",
  "chiefComplaint": "The primary symptom or reason for visit",
  "subjective": "Patient's narrative, HPI, duration, symptoms, severity, aggravating/relieving factors",
  "objective": "Doctor's examination observations, clinical signs, and stated vitals",
  "assessment": "Diagnoses, clinical impression, or diagnostic differential voiced by the doctor",
  "plan": "Comprehensive management, prescribed therapy, patient advice, warnings, follow-up instructions",
  "vitals": {
    "bpSys": "e.g. 120",
    "bpDia": "e.g. 80",
    "pulse": "e.g. 72",
    "temp": "e.g. 36.8",
    "spo2": "e.g. 98",
    "weight": "e.g. 70"
  },
  "prescriptions": ["Drug name dose route frequency duration"],
  "structuredPrescriptions": [
    { "name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..." }
  ],
  "labs": ["Lab test 1", "Lab test 2"],
  "uncertainties": ["Any ambiguous or unclear words / numbers / doses"],
  "clinicalOversight": ["Safety flags, verification alerts for doctor's clinical review"]
}`;

  const userContent = `${context ? `[ENCOUNTER CONTEXT & PATIENT DETAILS]:\n${context}\n\n` : ''}[CONSULTATION TRANSCRIPT]:\n${transcript}`;

  // Candidate chat models in order of capability on Groq
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 3500,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.warn(`Groq chat completion with ${model} returned ${res.status}:`, err);
        lastError = new Error(`Groq ${model} failed (${res.status}): ${err}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`Groq model ${model} produced empty content.`);
      }

      const parsed = JSON.parse(content);

      return {
        verbatimTranscript: parsed.verbatimTranscript || transcript,
        chiefComplaint: parsed.chiefComplaint || '',
        subjective: parsed.subjective || '',
        objective: parsed.objective || '',
        assessment: parsed.assessment || '',
        plan: parsed.plan || '',
        vitals: parsed.vitals || {},
        prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : [],
        structuredPrescriptions: Array.isArray(parsed.structuredPrescriptions) ? parsed.structuredPrescriptions : [],
        labs: Array.isArray(parsed.labs) ? parsed.labs : [],
        uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
        clinicalOversight: Array.isArray(parsed.clinicalOversight) ? parsed.clinicalOversight : [],
      };
    } catch (err: any) {
      console.error(`Error processing with ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq clinical scribe models failed to process the consultation.');
}
