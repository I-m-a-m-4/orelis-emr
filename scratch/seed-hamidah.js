require('dotenv').config();
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase environment variables.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();
const targetEmail = 'hamidahdejih2@gmail.com';

async function run() {
  console.log(`Looking up user profile for ${targetEmail}...`);
  const userQuery = await db.collection('users').where('email', '==', targetEmail).limit(1).get();

  if (userQuery.empty) {
    console.error(`User ${targetEmail} not found!`);
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;

  // Let's use a unique, professional clinic ID
  const clinicId = userData.clinicId || 'safeway-elite-medical';

  console.log(`Setting/Updating Clinic details...`);
  // Update/Set premium clinic details
  await db.collection('clinics').doc(clinicId).set({
    name: "Safeway Elite Clinical Research Hospital",
    address: "24 Herbert Macaulay Way, Yaba, Lagos",
    phone: "+234 812 777 9000",
    email: "clinical-records@safeway.med",
    country: "Nigeria",
    subscription: {
      plan: "infinite",
      status: "active"
    }
  }, { merge: true });

  // Update user doc with clinicId and doctor role
  await userDoc.ref.update({
    clinicId,
    role: 'doctor'
  });

  console.log(`Clinic name updated to "Safeway Elite Clinical Research Hospital" and linked to doctor ${userData.name}.`);

  // Seeding test patients
  const mockPatients = [
    {
      id: `pat-${uid}-1`,
      firstName: "Ademola",
      surname: "Idris",
      sex: "Male",
      dob: "1992-04-12",
      phone: "+234 803 999 8881",
      email: "ademola.idris@safeway.med",
      diagnosis: "Borderline Hypertension",
      vitals: [
        { id: "v1", type: "blood_pressure", value: "138/88", unit: "mmHg", timestamp: new Date().toISOString() },
        { id: "v2", type: "heart_rate", value: "82", unit: "bpm", timestamp: new Date().toISOString() }
      ]
    },
    {
      id: `pat-${uid}-2`,
      firstName: "Amina",
      surname: "Suleiman",
      sex: "Female",
      dob: "1988-09-24",
      phone: "+234 803 999 8882",
      email: "amina.suleiman@safeway.med",
      diagnosis: "Routine Metabolic Screen",
      vitals: [
        { id: "v1", type: "blood_pressure", value: "115/75", unit: "mmHg", timestamp: new Date().toISOString() },
        { id: "v2", type: "heart_rate", value: "74", unit: "bpm", timestamp: new Date().toISOString() }
      ]
    },
    {
      id: `pat-${uid}-3`,
      firstName: "Chinedu",
      surname: "Okafor",
      sex: "Male",
      dob: "1975-11-03",
      phone: "+234 803 999 8883",
      email: "chinedu.okafor@safeway.med",
      diagnosis: "Type 2 Diabetes Control",
      vitals: [
        { id: "v1", type: "blood_pressure", value: "128/82", unit: "mmHg", timestamp: new Date().toISOString() },
        { id: "v2", type: "glucose", value: "162", unit: "mg/dL", timestamp: new Date().toISOString() }
      ]
    }
  ];

  for (let i = 0; i < mockPatients.length; i++) {
    const p = mockPatients[i];
    const patientCode = `SAFE${i + 1}NEW`;
    console.log(`Setting up patient ${p.firstName} ${p.surname} (${patientCode})...`);

    await db.collection('patients').doc(p.id).set({
      id: p.id,
      clinicId,
      patientCode,
      surname: p.surname,
      firstName: p.firstName,
      sex: p.sex,
      maritalStatus: "Married",
      address: "Hospital Quarters Road, Lagos",
      dob: p.dob,
      phone: p.phone,
      email: p.email,
      registrationDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      status: "Active",
      nextOfKin: {
        name: "Next of Kin " + p.surname,
        relation: "Family member",
        address: "Hospital Quarters Road, Lagos",
        phone: p.phone
      }
    }, { merge: true });

    // Seeding encounters
    console.log(`  - Seeding historical clinical encounters...`);
    const encounterId = `enc-${uid}-${i}-final`;
    await db.collection('encounters').doc(encounterId).set({
      id: encounterId,
      clinicId,
      patientId: p.id,
      patientName: `${p.firstName} ${p.surname}`,
      doctorId: uid,
      doctorName: userData.name,
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: "Initial Consultation",
      diagnosis: p.diagnosis,
      status: "Finalized",
      soap: {
        subjective: `Patient presented for routine analysis regarding ${p.diagnosis.toLowerCase()}.`,
        objective: `Vitals stable. BP: ${p.vitals.find(v => v.type === 'blood_pressure')?.value || 'N/A'}.`,
        assessment: `Patient shows moderate markers. Standard therapy plan active.`,
        plan: `Follow up test ordered. Monitor stats.`
      },
      vitals: p.vitals
    }, { merge: true });

    // Seeding Appointments
    console.log(`  - Seeding appointment...`);
    const apptId = `appt-${uid}-${i}`;
    await db.collection('appointments').doc(apptId).set({
      id: apptId,
      clinicId,
      patientId: p.id,
      patientName: `${p.firstName} ${p.surname}`,
      doctorId: uid,
      doctorName: userData.name,
      appointmentDate: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
      reason: `${p.diagnosis} screening`,
      status: "Scheduled"
    }, { merge: true });
  }

  // Seeding Lab Orders
  console.log(`Seeding Laboratory Orders...`);
  const mockLabs = [
    {
      id: `lab-order-${uid}-1`,
      patientId: `pat-${uid}-1`,
      patientName: "Ademola Idris",
      testType: "Lipid Panel (LOINC 18262-6)",
      priority: "Urgent",
      requestedBy: userData.name,
      requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hrs ago
      status: "Processing"
    },
    {
      id: `lab-order-${uid}-2`,
      patientId: `pat-${uid}-2`,
      patientName: "Amina Suleiman",
      testType: "Fasting Blood Glucose (LOINC 2339-0)",
      priority: "Routine",
      requestedBy: userData.name,
      requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
      status: "Pending"
    },
    {
      id: `lab-order-${uid}-3`,
      patientId: `pat-${uid}-3`,
      patientName: "Chinedu Okafor",
      testType: "HbA1c Blood Panel (LOINC 4544-3)",
      priority: "Emergency",
      requestedBy: userData.name,
      requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hrs ago
      status: "Completed"
    }
  ];

  for (const lab of mockLabs) {
    console.log(`  - Creating lab order: ${lab.testType} for ${lab.patientName}...`);
    await db.collection('lab_orders').doc(lab.id).set({
      id: lab.id,
      clinicId,
      patientId: lab.patientId,
      patientName: lab.patientName,
      testType: lab.testType,
      priority: lab.priority,
      requestedBy: lab.requestedBy,
      requestedAt: lab.requestedAt,
      status: lab.status
    }, { merge: true });
  }

  console.log("\n🎉 Done seeding laboratory and clinic records for doctor Safeway!");
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
