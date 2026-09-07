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

async function getPatients() {
  const clinicId = 'j9JLgOlPGcSp5MkTatfNUMw7Uso2';
  const snap = await db.collection('patients').where('clinicId', '==', clinicId).get();
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(JSON.stringify({ id: d.id, name: `${data.firstName} ${data.surname}`, sex: data.sex, dob: data.dob, phone: data.phone }));
  });
}

getPatients().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
