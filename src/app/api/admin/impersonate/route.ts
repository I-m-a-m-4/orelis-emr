import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin';
import admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const { uid, targetUid } = await req.json();

    if (!uid || !targetUid) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    await initializeAdminApp();

    // Verify the requester is an admin
    const requesterRecord = await admin.auth().getUser(uid);
    const requesterIsAdmin = requesterRecord.customClaims?.superAdmin || requesterRecord.email === 'belloimam431@gmail.com' || requesterRecord.email === 'admin@orelis.app';

    if (!requesterIsAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Generate custom token for the target user
    const customToken = await admin.auth().createCustomToken(targetUid);

    return NextResponse.json({ success: true, customToken });
  } catch (error: any) {
    console.error('Error generating impersonation token:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
