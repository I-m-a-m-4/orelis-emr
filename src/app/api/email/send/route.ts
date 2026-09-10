import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/api-auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orelis-med.vercel.app';

// Premium Email Layout wrapper
function buildEmailHTML(title: string, imageUrl: string, bodyText: string, buttonText: string, buttonHref: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 60px 20px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #f97316; margin-bottom: 40px; text-decoration: none; display: inline-block; }
        h1 { font-size: 36px; font-weight: 800; color: #0f172a; margin-bottom: 40px; letter-spacing: -0.02em; line-height: 1.1; }
        .image-container { margin-bottom: 40px; }
        .image-container img { max-width: 280px; height: auto; display: inline-block; }
        .body-text { font-size: 15px; color: #334155; line-height: 1.6; max-width: 480px; margin: 0 auto 30px auto; }
        .btn { display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 9999px; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.2); }
        .footer { margin-top: 60px; font-size: 12px; color: #94a3b8; }
        .footer a { color: #94a3b8; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="${BASE_URL}" class="logo">Orelis</a>
        <h1>${title}</h1>
        <div class="image-container">
          <img src="${imageUrl}" alt="Email illustration" />
        </div>
        <div class="body-text">
          ${bodyText}
        </div>
        ${buttonText && buttonHref ? `<a href="${buttonHref}" class="btn">${buttonText}</a>` : ''}
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Orelis Medical Systems. All rights reserved.</p>
          <p><a href="#">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: Request) {
  // Allow receptionists and doctors to send emails
  const auth = await requireAuth(req, 'receptionist');
  if (!auth.ok) return auth.response;

  try {
    const { to, template, payload } = await req.json();

    if (!to || !template || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let subject = 'Message from Orelis Clinic';
    let html = '';

    if (template === 'appointment_confirmation') {
      subject = `Appointment Confirmed: ${payload.doctorName}`;
      const title = 'Your appointment<br/>is set.';
      const imageUrl = `${BASE_URL}/email-assets/appointment.jpg`;
      const bodyText = `
        Hi ${payload.patientName},<br/><br/>
        Your appointment with <strong>${payload.doctorName}</strong> is confirmed for <strong>${payload.appointmentTime}</strong>.
        ${payload.hospitalName ? `<br/><br/>Location: ${payload.hospitalName}` : ''}
        <br/><br/>Please arrive 10 minutes early.
      `;
      html = buildEmailHTML(title, imageUrl, bodyText, 'View Appointment', `${BASE_URL}/login`);
      
    } else if (template === 'patient_portal_link') {
      subject = 'Access Your Patient Portal';
      const title = 'Your records,<br/>anytime.';
      const imageUrl = `${BASE_URL}/email-assets/portal.jpg`;
      const bodyText = `
        Hi ${payload.patientName},<br/><br/>
        Your medical records are now available online. Your unique linking code is: <strong>${payload.patientCode}</strong><br/><br/>
        Log in, go to "My Records", and enter this code to securely access your data.
      `;
      html = buildEmailHTML(title, imageUrl, bodyText, 'Access Portal', `${BASE_URL}/login`);
      
    } else if (template === 'custom') {
      subject = payload.subject || 'Notification from Orelis';
      const title = payload.title || 'New Update';
      const imageUrl = `${BASE_URL}/email-assets/notification.jpg`;
      const bodyText = payload.html || 'You have a new notification.';
      html = buildEmailHTML(title, imageUrl, bodyText, payload.buttonText || 'Open App', payload.buttonHref || BASE_URL);
      
    } else {
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'Orelis Clinic <onboarding@resend.dev>', // Change to verified domain later
      to: to,
      subject: subject,
      html: html,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Failed to send email:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}
