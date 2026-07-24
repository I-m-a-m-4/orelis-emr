require('dotenv').config();
const admin = require('firebase-admin');

// Validate env vars
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Error: Missing Firebase environment variables. Please check your .env file.");
  process.exit(1);
}

// Initialize Admin App
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();

async function run() {
  const args = process.argv.slice(2);
  const email = args[0];
  const desiredRole = args[1] || 'patient'; // Default to patient, can be 'doctor'

  if (!email || !['patient', 'doctor'].includes(desiredRole)) {
    console.log("Usage: node scratch/seed-data.js <user-email-address> [patient|doctor]");
    console.log("\nAvailable users in your database:");
    const usersSnap = await db.collection('users').limit(10).get();
    if (usersSnap.empty) {
      console.log("No users found in the database. Please sign up an account first.");
    } else {
      usersSnap.forEach(doc => {
        const u = doc.data();
        console.log(`- Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | UID: ${u.uid}`);
      });
    }
    process.exit(0);
  }

  console.log(`Searching for user with email: ${email}...`);
  const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();

  if (userQuery.empty) {
    console.error(`Error: User with email "${email}" not found in 'users' collection.`);
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;

  console.log(`Found user: ${userData.name} (${uid})`);

  // 1. Ensure a clinic exists or generate a dummy one
  let clinicId = userData.clinicId;
  if (!clinicId) {
    clinicId = "orelis-general-clinic";
    console.log(`Setting up clinic "${clinicId}"...`);
    await db.collection('clinics').doc(clinicId).set({
      name: "Orelis General Hospital",
      address: "128 Innovation Way, Health District",
      phone: "+234 812 345 6789",
      email: "info@orelis.med",
      country: "Nigeria",
      subscription: {
        plan: "infinite",
        status: "active"
      }
    }, { merge: true });
    
    await userDoc.ref.update({ clinicId });
  }

  if (desiredRole === 'doctor') {
    // ---------------- DOCTOR SEEDING LOGIC ----------------
    console.log(`Seeding database for Doctor profile...`);

    // Update user role to doctor
    await userDoc.ref.update({
      role: "doctor",
      patientId: admin.firestore.FieldValue.delete()
    });
    console.log(`Updated user profile role to "doctor".`);

    // Array of mock patients to insert
    const mockPatients = [
      {
        id: `pat-${uid}-1`,
        firstName: "Ademola",
        surname: "Idris",
        sex: "Male",
        dob: "1992-04-12",
        phone: "+234 803 999 8881",
        email: "ademola.idris@orelis.med",
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
        email: "amina.suleiman@orelis.med",
        diagnosis: "Pregnancy Routine Checkup",
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
        email: "chinedu.okafor@orelis.med",
        diagnosis: "Type 2 Diabetes Control",
        vitals: [
          { id: "v1", type: "blood_pressure", value: "128/82", unit: "mmHg", timestamp: new Date().toISOString() },
          { id: "v2", type: "glucose", value: "162", unit: "mg/dL", timestamp: new Date().toISOString() }
        ]
      },
      {
        id: `pat-${uid}-4`,
        firstName: "Elizabeth",
        surname: "Adebayo",
        sex: "Female",
        dob: "1995-07-19",
        phone: "+234 803 999 8884",
        email: "elizabeth.adebayo@orelis.med",
        diagnosis: "Mild Asthma Flareup",
        vitals: [
          { id: "v1", type: "respiratory_rate", value: "22", unit: "pm", timestamp: new Date().toISOString() },
          { id: "v2", type: "oxygen_saturation", value: "95", unit: "%", timestamp: new Date().toISOString() }
        ]
      },
      {
        id: `pat-${uid}-5`,
        firstName: "Balarabe",
        surname: "Musa",
        sex: "Male",
        dob: "1960-01-30",
        phone: "+234 803 999 8885",
        email: "balarabe.musa@orelis.med",
        diagnosis: "Osteoarthritis Consultation",
        vitals: [
          { id: "v1", type: "temperature", value: "36.8", unit: "°C", timestamp: new Date().toISOString() }
        ]
      }
    ];

    for (let i = 0; i < mockPatients.length; i++) {
      const p = mockPatients[i];
      const patientCode = `CODE${i + 1}DOC`;
      console.log(`Creating test patient ${i + 1}/${mockPatients.length} (${p.firstName} ${p.surname})...`);
      
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
        registrationDate: new Date(Date.now() - 86400000 * 15 * (i + 1)).toISOString(), // Distributed registration dates
        status: "Active",
        nextOfKin: {
          name: "Kin " + p.surname,
          relation: "Family member",
          address: "Hospital Quarters Road, Lagos",
          phone: p.phone
        }
      }, { merge: true });

      // Seed multiple historical encounters assigned to this doctor to show timeline progression
      const encounterCount = 6;
      for (let k = 0; k < encounterCount; k++) {
        const encounterId = `enc-for-${uid}-${i + 1}-history-${k}`;
        const daysAgo = (encounterCount - 1 - k) * 15; // Spanning 75 days, ending at 0 days ago (today)
        const date = new Date(Date.now() - 86400000 * daysAgo).toISOString();
        
        // Slightly vary the vitals to simulate progression/regression
        const fluctuatedVitals = p.vitals.map(v => {
          let valStr = v.value;
          if (v.type === 'blood_pressure') {
            const [sys, dia] = v.value.split('/').map(Number);
            const sysDelta = Math.floor(Math.random() * 11) - 5 - (k * 2); // trending downwards
            const diaDelta = Math.floor(Math.random() * 7) - 3 - k;
            valStr = `${sys + sysDelta}/${dia + diaDelta}`;
          } else if (v.type === 'heart_rate') {
            const hr = Number(v.value);
            const hrDelta = Math.floor(Math.random() * 7) - 3;
            valStr = String(hr + hrDelta);
          } else if (v.type === 'glucose') {
            const glu = Number(v.value);
            const gluDelta = Math.floor(Math.random() * 21) - 10 - (k * 4); // trending downwards
            valStr = String(Math.max(90, glu + gluDelta));
          } else if (v.type === 'oxygen_saturation') {
            valStr = String(Math.min(100, Number(v.value) + (Math.random() > 0.5 ? 1 : 0)));
          }
          return {
            ...v,
            id: `${v.id}-k${k}`,
            value: valStr,
            timestamp: date
          };
        });

        console.log(`  - Creating historical encounter ${k + 1}/${encounterCount} (${encounterId})...`);
        await db.collection('encounters').doc(encounterId).set({
          id: encounterId,
          clinicId,
          patientId: p.id,
          patientName: `${p.firstName} ${p.surname}`,
          doctorId: uid,
          doctorName: userData.name,
          date: date,
          type: k === 0 ? "Initial Consultation" : "Follow-up",
          diagnosis: p.diagnosis,
          status: "Finalized",
          soap: {
            subjective: `Patient presented for progress check regarding ${p.diagnosis.toLowerCase()}. Currently at day ${k * 15} of monitoring.`,
            objective: `Vitals measured: ${fluctuatedVitals.map(v => `${v.type.replace('_', ' ')}: ${v.value} ${v.unit}`).join(', ')}.`,
            assessment: `Clinical state is ${k > 3 ? 'improving and stabilizing' : 'under active management'} for ${p.diagnosis}.`,
            plan: `Continue current therapy plan. Next follow-up in 15 days.`
          },
          vitals: fluctuatedVitals
        }, { merge: true });
      }

      // Seed appointments assigned to this doctor (some past, some future)
      const appointmentId = `appt-for-${uid}-${i + 1}`;
      console.log(`  - Creating appointment (${appointmentId})...`);
      const daysOffset = i === 0 ? 1 : i === 1 ? 2 : -2 * i; // Distribute future and past appointments
      await db.collection('appointments').doc(appointmentId).set({
        id: appointmentId,
        clinicId,
        patientId: p.id,
        patientName: `${p.firstName} ${p.surname}`,
        doctorId: uid,
        doctorName: userData.name,
        appointmentDate: new Date(Date.now() + 86400000 * daysOffset).toISOString(),
        reason: `${p.diagnosis} monitoring`,
        status: daysOffset > 0 ? "Scheduled" : "Completed"
      }, { merge: true });
    }

    console.log(`\n🎉 Successfully configured "${userData.name}" as a Doctor with multiple patient files!`);
    console.log("- Set role to 'doctor'");
    console.log(`- Created ${mockPatients.length} test patients with appointments & encounters assigned to this doctor.`);
    console.log("- They will now see active stats, patient lists, and charts populated on the Doctor Dashboard.");

  } else {
    // ---------------- PATIENT SEEDING LOGIC ----------------
    let patientId = userData.patientId;
    const patientCode = "ONTOMORPH1";

    if (!patientId) {
      patientId = `patient-${uid}`;
    }

    console.log(`Seeding patient record (${patientId}) with code "${patientCode}"...`);
    const patientRef = db.collection('patients').doc(patientId);
    const patientData = {
      id: patientId,
      clinicId,
      patientCode,
      surname: userData.name.split(' ').slice(-1)[0] || "Doe",
      firstName: userData.name.split(' ').slice(0, -1).join(' ') || "John",
      sex: "Male",
      maritalStatus: "Single",
      address: "12 Health Crescent, Lagos",
      dob: "1994-06-15",
      phone: "+234 803 111 2222",
      email: email,
      registrationDate: new Date().toISOString(),
      status: "Active",
      nextOfKin: {
        name: "Jane Doe",
        relation: "Sibling",
        address: "12 Health Crescent, Lagos",
        phone: "+234 803 111 2223"
      }
    };

    await patientRef.set(patientData, { merge: true });

    // Update user with patient role and link it
    await userDoc.ref.update({
      role: "patient",
      patientId: patientId
    });
    console.log(`Updated user profile role to "patient" and linked patientId.`);

    // Seed LOINC-coded Vitals (Encounters) for Lab Report Explainer
    const encounterId = `encounter-${uid}-1`;
    console.log(`Seeding encounter (${encounterId}) with LOINC-coded vitals...`);
    await db.collection('encounters').doc(encounterId).set({
      id: encounterId,
      clinicId,
      patientId,
      patientName: userData.name,
      doctorId: "doctor-demo",
      doctorName: "Dr. Clara Osas",
      date: new Date().toISOString(),
      type: "Consultation",
      diagnosis: "Borderline Metabolic Syndrome Risk",
      status: "Finalized",
      soap: {
        subjective: "Patient reports slight fatigue and requests a general wellness screening check.",
        objective: "Vitals stable. Mildly elevated glucose levels noticed.",
        assessment: "Borderline pre-diabetes indicated by lab metrics.",
        plan: "Recommend exercise regimen, dietary adjustment, and monitor HbA1c in 3 months."
      },
      vitals: [
        {
          id: "vital-1",
          type: "heart_rate",
          value: "76",
          unit: "bpm",
          timestamp: new Date().toISOString()
        },
        {
          id: "vital-2",
          type: "blood_pressure",
          value: "122/80",
          unit: "mmHg",
          timestamp: new Date().toISOString()
        },
        {
          id: "vital-3",
          type: "glucose",
          value: "105", // MOCK_LOINC_CONCEPTS "2339-0" triggers "Mildly Elevated"
          unit: "mg/dL",
          timestamp: new Date().toISOString()
        },
        {
          id: "vital-4",
          type: "ldl", // MOCK_LOINC_CONCEPTS "18262-6" triggers "Borderline High"
          value: "115",
          unit: "mg/dL",
          timestamp: new Date().toISOString()
        },
        {
          id: "vital-5",
          type: "hba1c", // MOCK_LOINC_CONCEPTS "4544-3" triggers "Mildly Elevated"
          value: "5.8",
          unit: "%",
          timestamp: new Date().toISOString()
        }
      ]
    }, { merge: true });

    // Seed Prescriptions (Aspirin + Warfarin) to trigger Drug Safety Checker
    const prescriptionId = `prescription-${uid}-1`;
    console.log(`Seeding prescription (${prescriptionId}) with interacting drugs (Aspirin + Warfarin)...`);
    await db.collection('prescriptions').doc(prescriptionId).set({
      id: prescriptionId,
      clinicId,
      patientId,
      patientName: userData.name,
      doctorId: "doctor-demo",
      doctorName: "Dr. Clara Osas",
      date: new Date().toISOString(),
      status: "Dispensed",
      medications: [
        {
          name: "Aspirin",
          dosage: "75mg",
          frequency: "Once daily",
          duration: "30 days",
          quantity: 30
        },
        {
          name: "Warfarin",
          dosage: "5mg",
          frequency: "Once daily",
          duration: "30 days",
          quantity: 30
        }
      ],
      notes: "Requires regular INR monitoring."
    }, { merge: true });

    // Seed Appointments
    const appointmentId = `appt-${uid}-1`;
    console.log(`Seeding appointment (${appointmentId})...`);
    await db.collection('appointments').doc(appointmentId).set({
      id: appointmentId,
      clinicId,
      patientId,
      patientName: userData.name,
      doctorId: "doctor-demo",
      doctorName: "Dr. Clara Osas",
      appointmentDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
      reason: "Metabolic and Lipid Level Follow-up",
      status: "Scheduled"
    }, { merge: true });

    console.log(`\n🎉 Successfully seeded dummy data for "${userData.name}"!`);
    console.log(`- Linked Patient Code: ${patientCode}`);
    console.log("- Enabled Patient Portal view widgets:");
    console.log("  * Twin Visualizer / What-If Coach (using seeded metrics/vitals)");
    console.log("  * HOLON Lab Report Explainer (using LOINC vitals: Glucose, LDL, HbA1c)");
    console.log("  * HOLON Drug Safety Checker (seeded with Aspirin + Warfarin)");
  }
}

run().catch(err => {
  console.error("Unhandled error seeding database:", err);
  process.exit(1);
});
