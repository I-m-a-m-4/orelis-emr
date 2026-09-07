require('dotenv').config();
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase environment variables in .env.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
}

const db = admin.firestore();
const targetEmail = 'hamidahdejih2@gmail.com';

async function seedAppointments() {
  console.log(`\n========================================`);
  console.log(`Seeding Appointments for: ${targetEmail}`);
  console.log(`========================================\n`);

  // 1. Find user
  const userSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
  if (userSnap.empty) {
    console.error(`User with email ${targetEmail} not found!`);
    process.exit(1);
  }

  const userDoc = userSnap.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;
  const clinicId = userData.clinicId || uid;
  const doctorName = "Dr. Hamidah Deji";

  console.log(`User found: UID=${uid}, ClinicId=${clinicId}`);

  // 2. Fetch or verify patients in this clinic
  const patientSnap = await db.collection('patients').where('clinicId', '==', clinicId).get();
  let patients = [];
  if (!patientSnap.empty) {
    patients = patientSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  if (patients.length === 0) {
    console.error(`No patients found for clinicId ${clinicId}.`);
    process.exit(1);
  }
  console.log(`✓ Loaded ${patients.length} clinic patients.`);

  // 3. Clear old outdated July appointments for a clean screenshot view
  const oldApptsSnap = await db.collection('appointments').where('clinicId', '==', clinicId).get();
  console.log(`Clearing ${oldApptsSnap.size} previous/outdated appointment records...`);
  for (const doc of oldApptsSnap.docs) {
    await doc.ref.delete();
  }

  // 4. Construct high-density upcoming, completed, and cancelled appointments
  const now = Date.now();
  const hour = 3600 * 1000;
  const day = 24 * hour;

  // Helper to pick patient or fallback
  const getPat = (index) => patients[index % patients.length];

  const apptsList = [
    // --- UPCOMING APPOINTMENTS (Current & Next Few Days) ---
    {
      patient: getPat(0),
      dateOffset: hour * 2.5, // 2.5 hours from now today!
      reason: "Cardiology Review & 12-Lead ECG Evaluation",
      status: "Scheduled"
    },
    {
      patient: getPat(1),
      dateOffset: hour * 5, // 5 hours from now today!
      reason: "Antenatal 2nd Trimester Ultrasound & Vitals Screening",
      status: "Scheduled"
    },
    {
      patient: getPat(2),
      dateOffset: day * 1 + hour * 3, // Tomorrow morning
      reason: "Type 2 Diabetes Glycemic Control & Foot Exam",
      status: "Scheduled"
    },
    {
      patient: getPat(3),
      dateOffset: day * 1 + hour * 7, // Tomorrow afternoon
      reason: "Post-Op Wound Assessment & Suture Removal Check",
      status: "Scheduled"
    },
    {
      patient: getPat(4),
      dateOffset: day * 3 + hour * 2, // In 3 days
      reason: "Hypertension Medication Titration & Renal Panel Review",
      status: "Scheduled"
    },
    {
      patient: getPat(5),
      dateOffset: day * 5 + hour * 4, // In 5 days
      reason: "Routine Comprehensive Health Maintenance Checkup",
      status: "Scheduled"
    },

    // --- PAST / COMPLETED APPOINTMENTS ---
    {
      patient: getPat(0),
      dateOffset: -day * 1, // Yesterday
      reason: "Initial Consultation: Exertional Dyspnea & Palpitations",
      status: "Completed"
    },
    {
      patient: getPat(1),
      dateOffset: -day * 3, // 3 days ago
      reason: "Routine Blood Work & Iron Supplementation Prescription",
      status: "Completed"
    },
    {
      patient: getPat(2),
      dateOffset: -day * 5, // 5 days ago
      reason: "HbA1c Blood Panel Review & Nutritional Counseling",
      status: "Completed"
    },
    {
      patient: getPat(3),
      dateOffset: -day * 8, // 8 days ago
      reason: "Pre-Operative Clearance & Surgical Evaluation",
      status: "Completed"
    },

    // --- CANCELLED APPOINTMENTS ---
    {
      patient: getPat(4),
      dateOffset: -day * 2, // 2 days ago
      reason: "Patient requested reschedule due to inter-state travel",
      status: "Cancelled"
    }
  ];

  console.log(`\n--- Seeding ${apptsList.length} Appointments ---`);
  for (let i = 0; i < apptsList.length; i++) {
    const item = apptsList[i];
    const apptId = `appt-${clinicId}-${i + 1}`;
    const appointmentDate = new Date(now + item.dateOffset).toISOString();
    const patientFullName = `${item.patient.firstName} ${item.patient.surname}`;

    await db.collection('appointments').doc(apptId).set({
      id: apptId,
      clinicId,
      patientId: item.patient.id,
      patientName: patientFullName,
      doctorId: uid,
      doctorName: doctorName,
      appointmentDate,
      reason: item.reason,
      status: item.status
    });

    const dateFormatted = new Date(appointmentDate).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log(`  ✓ [${item.status}] ${patientFullName} · ${dateFormatted} · "${item.reason}"`);
  }

  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS! APPOINTMENTS PAGE DATA POPULATED!`);
  console.log(`- 6 Upcoming scheduled appointments (today, tomorrow, this week)`);
  console.log(`- 4 Past completed appointments with clinical notes`);
  console.log(`- 1 Cancelled appointment`);
  console.log(`- All appointments linked to real clinic patients with Doctor: ${doctorName}`);
  console.log(`========================================\n`);
}

seedAppointments().then(() => process.exit(0)).catch(err => {
  console.error("Seeding Appointments Error:", err);
  process.exit(1);
});
