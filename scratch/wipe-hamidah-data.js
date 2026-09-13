require('dotenv').config();
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase environment variables.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = admin.firestore();
const targetEmail = 'hamidahdejih2@gmail.com';

async function wipe() {
  console.log(`Wiping data for ${targetEmail}...`);
  const userQuery = await db.collection('users').where('email', '==', targetEmail).limit(1).get();

  if (userQuery.empty) {
    console.error(`User ${targetEmail} not found!`);
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;
  const clinicId = userData.clinicId;

  if (!clinicId) {
    console.log("No clinicId found on user, nothing to wipe.");
    process.exit(0);
  }

  console.log(`Wiping for clinicId: ${clinicId}`);

  const collections = ['patients', 'encounters', 'appointments', 'labOrders', 'pharmacy'];

  for (const coll of collections) {
    const snap = await db.collection(coll).where('clinicId', '==', clinicId).get();
    console.log(`Deleting ${snap.size} documents from ${coll}...`);
    for (const doc of snap.docs) {
      await doc.ref.delete();
    }
  }

  console.log("Successfully wiped seeded data.");
}

wipe().then(() => process.exit(0)).catch(err => {
  console.error("Wipe Error:", err);
  process.exit(1);
});
