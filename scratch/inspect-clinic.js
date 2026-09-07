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

async function inspect() {
  const clinicId = 'j9JLgOlPGcSp5MkTatfNUMw7Uso2';
  console.log('Inspecting clinic:', clinicId);

  const clinicDoc = await db.collection('clinics').doc(clinicId).get();
  console.log('Clinic exists?', clinicDoc.exists, clinicDoc.data());

  const collections = ['patients', 'wards', 'admissions', 'medications', 'prescriptions', 'beds', 'encounters'];
  for (const col of collections) {
    const snap = await db.collection(col).where('clinicId', '==', clinicId).get();
    console.log(`Collection ${col}: ${snap.size} documents`);
    if (snap.size > 0 && snap.size <= 5) {
      snap.docs.forEach(d => console.log(`  [${col}] id=${d.id}:`, JSON.stringify(d.data()).slice(0, 120)));
    }
  }
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
