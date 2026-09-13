'use server';
/**
 * @fileOverview Clinical Consultation Ambient Scribe & Note Generator powered by Groq.
 *
 * ## Why Groq:
 * 1. Low cost & ultra-high throughput on Groq LPUs.
 * 2. Specialized Whisper (`whisper-large-v3-turbo`) for high-fidelity clinical speech transcription.
 * 3. Advanced reasoning model (`qwen/qwen3.8-27b`) for accurate SOAP note structuring,
 *    vitals extraction, and safety oversight detection.
 *
 * ## Absolute Medical Rules:
 * - A scribe must NEVER invent or hallucinate clinical findings.
 * - If vitals or exam findings weren't voiced, the fields remain empty.
 * - Surfacing uncertainties & clinical oversight checks gives the clinician final veto power before
 *   any note is committed to the medical record.
 */

import {
  transcribeAudioWithGroq,
  structureClinicalNoteWithGroq,
  type GroqVitals,
  type GroqPrescription,
} from '@/lib/groq';

export interface ScribeInput {
  /** The recording as a data URL (`data:audio/webm;base64,...`) or base64 string */
  audioDataUrl: string;
  /** Optional encounter context, e.g. presenting complaint or patient history */
  context?: string;
}

export interface ScribeOutput {
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

export async function transcribeEncounter(input: ScribeInput): Promise<ScribeOutput> {
  const { audioDataUrl, context } = input;

  if (!audioDataUrl) {
    throw new Error('No audio data provided to clinical scribe.');
  }

  // 1. Transcribe audio with Groq Whisper
  const transcript = await transcribeAudioWithGroq(audioDataUrl);

  if (!transcript || !transcript.trim()) {
    return {
      verbatimTranscript: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      prescriptions: [],
      labs: [],
      uncertainties: ['No clear speech detected in recording.'],
      clinicalOversight: ['Empty recording — check microphone settings.'],
    };
  }

  // 2. Structure into SOAP clinical note with Groq LLM
  const structured = await structureClinicalNoteWithGroq(transcript, context);

  return structured;
}
