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

async function checkAppts() {
  const clinicId = 'j9JLgOlPGcSp5MkTatfNUMw7Uso2';
  const snap = await db.collection('appointments').where('clinicId', '==', clinicId).get();
  console.log(`Found ${snap.size} appointments for clinicId ${clinicId}:`);
  snap.docs.forEach(d => {
    console.log(d.id, JSON.stringify(d.data()));
  });
}

checkAppts().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
