
import admin from 'firebase-admin';
import type { App, ServiceAccount } from 'firebase-admin/app';

// This is a more robust way to handle service account credentials, especially in serverless environments like Vercel.
// Instead of parsing a complex JSON string, we build the credential from individual environment variables.

export async function initializeAdminApp(): Promise<App> {
  // Check if the app is already initialized to avoid errors.
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Construct the service account object from individual environment variables.
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key needs to have its escaped newlines replaced with actual newlines.
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate that all required environment variables are present.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin initialization failed. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
  }

  // Initialize the app with the constructed credential.
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function getAdminDb() {
  await initializeAdminApp();
  return admin.firestore();
}
