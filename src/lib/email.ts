import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.NEXT_PUBLIC_APP_NAME ? `${process.env.NEXT_PUBLIC_APP_NAME} <hello@orelis.app>` : 'Orelis <hello@orelis.app>',
      to,
      subject,
      html: html || '',
      text: text || '',
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}
