// appointment-reminders.ts
'use server';
/**
 * @fileOverview Generates personalized SMS appointment reminders to be sent 24 hours in advance, avoiding typical sleep hours.
 *
 * - generateAppointmentReminder - A function that generates and returns the appointment reminder message.
 * - AppointmentReminderInput - The input type for the generateAppointmentReminder function.
 * - AppointmentReminderOutput - The return type for the generateAppointmentReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AppointmentReminderInputSchema = z.object({
  patientName: z.string().describe('The name of the patient.'),
  appointmentTime: z.string().describe('The time of the appointment (e.g., 2024-08-15T14:30:00).'),
  doctorName: z.string().describe('The name of the doctor.'),
  hospitalName: z.string().describe('The name of the hospital.'),
});
export type AppointmentReminderInput = z.infer<typeof AppointmentReminderInputSchema>;

const AppointmentReminderOutputSchema = z.object({
  reminderMessage: z.string().describe('The personalized SMS reminder message.'),
});
export type AppointmentReminderOutput = z.infer<typeof AppointmentReminderOutputSchema>;

export async function generateAppointmentReminder(input: AppointmentReminderInput): Promise<AppointmentReminderOutput> {
  return appointmentReminderFlow(input);
}

const appointmentReminderPrompt = ai.definePrompt({
  name: 'appointmentReminderPrompt',
  input: {schema: AppointmentReminderInputSchema},
  output: {schema: AppointmentReminderOutputSchema},
  prompt: `You are an expert in generating personalized SMS appointment reminders for a hospital.
  Given the following information, create a concise and friendly reminder message that includes the patient's name, appointment time, doctor's name, and hospital name.
  The message should be no more than 160 characters to ensure it can be sent as a single SMS.
  Avoid using overly formal language.  The message should only contain the reminder and not any other content. It MUST NOT include the time zone.

  Patient Name: {{{patientName}}}
  Appointment Time: {{{appointmentTime}}}
  Doctor Name: {{{doctorName}}}
  Hospital Name: {{{hospitalName}}}
  `, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  }
});

const appointmentReminderFlow = ai.defineFlow(
  {
    name: 'appointmentReminderFlow',
    inputSchema: AppointmentReminderInputSchema,
    outputSchema: AppointmentReminderOutputSchema,
  },
  async input => {
    const {output} = await appointmentReminderPrompt(input);
    return output!;
  }
);
