'use server';
/**
 * @fileOverview Clinical dictation: audio in, a structured SOAP note out.
 *
 * ## Why this replaces what was there
 *
 * The scribe previously did two things, and neither was what it claimed:
 *
 * 1. **Transcription** used `webkitSpeechRecognition`. That is Chrome/Edge only —
 *    it silently does nothing in Safari, Firefox, and a large share of embedded
 *    WebViews — and it is a general-purpose model. It hears "amoxicillin" as
 *    "a mox a sillin" and "hydrochlorothiazide" as almost anything. A drug name
 *    is the one part of a clinical note that must not be approximated.
 *
 * 2. **Structuring** was advertised as AI and was a substring matcher over
 *    keyword lists. It filed any sentence containing "chest" under Objective —
 *    including "she says she has chest pain", which is Subjective by definition —
 *    and inferred a diagnosis from whether the word "malaria" appeared anywhere.
 *
 * Gemini is multimodal, so both jobs are one request: the audio goes to the model
 * and comes back as fielded text. Fewer moving parts, and the transcription is
 * done by a model that has the clinical vocabulary in it.
 *
 * ## The rule this prompt is built around
 *
 * A scribe must never contribute clinical content. Everything it emits has to be
 * traceable to something that was said, because a plausible invented vital sign is
 * far more dangerous than a blank field — a clinician skims a filled form and
 * signs it. Hence `verbatimTranscript` alongside the structured fields: the
 * clinician can check the structuring against what was actually recorded, and the
 * component shows both.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScribeInputSchema = z.object({
  /**
   * The recording as a data URL (`data:audio/webm;base64,...`).
   *
   * A data URL rather than raw base64 so the media type travels with the bytes;
   * MediaRecorder's container varies by browser (webm/opus on Chromium, mp4/aac
   * on Safari) and the model needs to be told which it got.
   */
  audioDataUrl: z
    .string()
    .describe('The dictation audio as a data URL, including its media type.'),
  /** Optional steer, e.g. the presenting complaint already on the form. */
  context: z
    .string()
    .optional()
    .describe('Any context already known about this encounter.'),
});
export type ScribeInput = z.infer<typeof ScribeInputSchema>;

const ScribeOutputSchema = z.object({
  verbatimTranscript: z
    .string()
    .describe('Exactly what was said, with no reorganisation or cleanup.'),
  subjective: z.string().describe("The patient's own account: complaint, history, symptoms."),
  objective: z.string().describe('Examination findings and vitals that were actually stated.'),
  assessment: z.string().describe('The diagnosis or impression the clinician voiced.'),
  plan: z.string().describe('Treatment, prescriptions, investigations, follow-up.'),
  chiefComplaint: z.string().optional().describe('The single presenting complaint, if stated.'),
  prescriptions: z
    .array(z.string())
    .describe('Each medication as spoken: name, dose, route, frequency, duration.'),
  labs: z.array(z.string()).describe('Investigations or imaging that were ordered.'),
  /**
   * Anything the model could not make out.
   *
   * The most useful field on this object. A misheard drug name that lands
   * confidently in `prescriptions` is a prescribing error; the same word surfaced
   * here is a question the clinician answers in five seconds.
   */
  uncertainties: z
    .array(z.string())
    .describe('Terms that were unclear in the audio and need human confirmation.'),
});
export type ScribeOutput = z.infer<typeof ScribeOutputSchema>;

export async function transcribeEncounter(input: ScribeInput): Promise<ScribeOutput> {
  return clinicalScribeFlow(input);
}

const clinicalScribeFlow = ai.defineFlow(
  {
    name: 'clinicalScribeFlow',
    inputSchema: ScribeInputSchema,
    outputSchema: ScribeOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      output: { schema: ScribeOutputSchema },
      prompt: [
        { media: { url: input.audioDataUrl } },
        {
          text: `You are a clinical scribe transcribing a consultation for an electronic
medical record. Transcribe the audio, then organise it into a SOAP note.

${input.context ? `Context already recorded for this encounter: ${input.context}\n` : ''}
ABSOLUTE RULES — these matter more than completeness:

1. Record only what was actually said. Never infer, complete or tidy up clinical
   content. If no blood pressure was spoken, the objective field contains no blood
   pressure. An empty field is correct and safe; an invented one is not, because a
   clinician skim-reading a filled form will sign it.
2. Never produce a diagnosis the clinician did not voice. If they described
   symptoms without concluding, leave "assessment" empty.
3. Put any term you could not make out into "uncertainties", using your best guess
   plus a question mark — for example "metronidazole?" or "500mg or 5mg?". Do this
   especially for drug names, doses and numbers. Guessing silently at a dose is the
   single worst thing you can do here.
4. "verbatimTranscript" is exactly what was said, including hesitations and
   repetition. Do not clean it up — it is the record the clinician checks your
   structuring against.

Assigning the four fields:
- Subjective: what the patient reports. "I have chest pain" is subjective even
  though it mentions the chest.
- Objective: what the clinician measured or observed on examination.
- Assessment: the diagnosis or impression the clinician stated.
- Plan: medications, investigations, referrals, follow-up, advice.

For "prescriptions", give each medication exactly as spoken — name, dose, route,
frequency and duration. Do not normalise a dose, expand an abbreviation, or add a
frequency that was not said.`,
        },
      ],
      config: {
        // Near-deterministic: this is transcription, not composition. Sampling
        // variety here would mean a different note from the same recording.
        temperature: 0.1,
        safetySettings: [
          // Clinical dictation routinely describes injury, self-harm, overdose and
          // sexual history. A safety filter that refuses those refuses the medical
          // record itself, so the categories that collide with legitimate clinical
          // content are relaxed while hate speech and harassment stay enforced.
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      },
    });

    if (!output) {
      throw new Error('The scribe returned no structured output.');
    }

    return output;
  }
);
