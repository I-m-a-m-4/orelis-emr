import { NextResponse } from 'next/server';
import { getAdminDb, initializeAdminApp } from '@/firebase/admin';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ success: false, message: 'Missing user ID' }, { status: 400 });
    }

    await initializeAdminApp();
    const db = await getAdminDb();

    // Verify the requester is an admin
    const requesterRecord = await admin.auth().getUser(uid);
    const requesterIsAdmin = requesterRecord.customClaims?.superAdmin || requesterRecord.email === 'belloimam431@gmail.com' || requesterRecord.email === 'admin@orelis.app';

    if (!requesterIsAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Query for users who are clinicians/admins but haven't completed onboarding
    const usersSnapshot = await db.collection('users')
      .where('onboardingCompleted', '==', false)
      .get();

    let emailsSent = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      if (user.email && (user.role === 'admin' || user.role === 'doctor' || user.role === 'clinic')) {
        const result = await sendEmail({
          to: user.email,
          subject: 'Need help setting up your Orelis Clinic?',
          html: `
            <p>Hi ${user.name || 'there'},</p>
            <p>We noticed you started setting up your clinic on Orelis but haven't completed the process yet.</p>
            <p>If you have any questions or need a hand, our team is here to help! Just reply to this email, and we'll gladly assist you in getting your clinic online.</p>
            <p>Best regards,<br>The Orelis Team</p>
          `,
        });

        if (result.success) {
          emailsSent++;
          // Optionally mark that we sent the email so we don't spam them
          await doc.ref.update({ retentionEmailSent: true });
        }
      }
    }

    return NextResponse.json({ success: true, message: `Successfully sent ${emailsSent} retention emails.` });
  } catch (error: any) {
    console.error('Error sending retention emails:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
