require('dotenv').config();
const admin = require('firebase-admin');
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });
}

const db = admin.firestore();

async function verifyQueries() {
  const clinicId = 'j9JLgOlPGcSp5MkTatfNUMw7Uso2';
  console.log('Testing Frontend Queries for clinic:', clinicId);

  // 1. Wards query
  const wards = await db.collection('wards').where('clinicId', '==', clinicId).get();
  console.log(`✓ Wards: ${wards.size} records`);

  // 2. Admissions query
  const admissions = await db.collection('admissions')
    .where('clinicId', '==', clinicId)
    .where('status', '==', 'Admitted')
    .get();
  console.log(`✓ Admissions: ${admissions.size} records`);

  // 3. Medications query
  try {
    const meds = await db.collection('medications')
      .where('clinicId', '==', clinicId)
      .orderBy('name', 'asc')
      .get();
    console.log(`✓ Medications (sorted by name): ${meds.size} records`);
  } catch (e) {
    console.warn(`! Medications query error (composite index might be needed if Firestore SDK enforces it):`, e.message);
  }

  // 4. Prescriptions query
  try {
    const rx = await db.collection('prescriptions')
      .where('clinicId', '==', clinicId)
      .orderBy('date', 'desc')
      .get();
    console.log(`✓ Prescriptions (sorted by date): ${rx.size} records`);
  } catch (e) {
    console.warn(`! Prescriptions query error:`, e.message);
  }
}

verifyQueries().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
