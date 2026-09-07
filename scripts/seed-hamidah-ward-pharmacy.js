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

async function seed() {
  console.log(`\n========================================`);
  console.log(`Seeding Ward & Pharmacy Data for: ${targetEmail}`);
  console.log(`========================================\n`);

  // 1. Locate user
  const userSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
  if (userSnap.empty) {
    console.error(`User with email ${targetEmail} not found!`);
    process.exit(1);
  }

  const userDoc = userSnap.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;
  const clinicId = userData.clinicId || uid;
  const doctorName = userData.name || "Dr. Hamidah Deji";

  console.log(`User found: UID=${uid}, Name="${doctorName}", ClinicId="${clinicId}"`);

  // 2. Ensure Clinic details are complete
  await db.collection('clinics').doc(clinicId).set({
    name: "Safeway Elite Clinical Research Hospital",
    address: "24 Herbert Macaulay Way, Yaba, Lagos",
    phone: "+234 812 777 9000",
    email: targetEmail,
    country: "Nigeria",
    subscription: {
      plan: "infinite",
      status: "active",
      expiryDate: null
    }
  }, { merge: true });
  console.log(`✓ Confirmed hospital profile for clinicId: ${clinicId}`);

  // 3. Fetch existing patients for this clinic
  const patientSnap = await db.collection('patients').where('clinicId', '==', clinicId).get();
  let patients = [];
  if (!patientSnap.empty) {
    patients = patientSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`✓ Loaded ${patients.length} existing clinic patients.`);
  }

  // If fewer than 6 patients exist, let's create a few high-quality patients
  const defaultPatients = [
    {
      id: `pat-${clinicId}-1`,
      patientCode: "SAFE-101",
      firstName: "Ademola",
      surname: "Idris",
      sex: "Male",
      dob: "1992-04-12",
      phone: "+234 803 999 8881",
      email: "ademola.idris@safeway.med",
      address: "14 Palm Avenue, Victoria Island, Lagos",
      maritalStatus: "Married",
      status: "Active"
    },
    {
      id: `pat-${clinicId}-2`,
      patientCode: "SAFE-102",
      firstName: "Amina",
      surname: "Suleiman",
      sex: "Female",
      dob: "1988-09-24",
      phone: "+234 803 999 8882",
      email: "amina.suleiman@safeway.med",
      address: "7 Crescent Road, Ikoyi, Lagos",
      maritalStatus: "Single",
      status: "Active"
    },
    {
      id: `pat-${clinicId}-3`,
      patientCode: "SAFE-103",
      firstName: "Chinedu",
      surname: "Okafor",
      sex: "Male",
      dob: "1975-11-03",
      phone: "+234 803 999 8883",
      email: "chinedu.okafor@safeway.med",
      address: "52 Allen Avenue, Ikeja, Lagos",
      maritalStatus: "Married",
      status: "Active"
    },
    {
      id: `pat-${clinicId}-4`,
      patientCode: "SAFE-104",
      firstName: "Elizabeth",
      surname: "Adebayo",
      sex: "Female",
      dob: "1995-07-19",
      phone: "+234 803 999 8884",
      email: "elizabeth.adebayo@safeway.med",
      address: "18 Admiralty Way, Lekki Phase 1, Lagos",
      maritalStatus: "Married",
      status: "Active"
    },
    {
      id: `pat-${clinicId}-5`,
      patientCode: "SAFE-105",
      firstName: "Balarabe",
      surname: "Musa",
      sex: "Male",
      dob: "1960-01-30",
      phone: "+234 803 999 8885",
      email: "balarabe.musa@safeway.med",
      address: "9 Bode Thomas Street, Surulere, Lagos",
      maritalStatus: "Married",
      status: "Active"
    },
    {
      id: `pat-${clinicId}-6`,
      patientCode: "SAFE-106",
      firstName: "Folashade",
      surname: "Balogun",
      sex: "Female",
      dob: "1984-12-05",
      phone: "+234 802 444 7771",
      email: "folashade.balogun@safeway.med",
      address: "31 Awolowo Road, Ikoyi, Lagos",
      maritalStatus: "Married",
      status: "Active"
    }
  ];

  for (const p of defaultPatients) {
    await db.collection('patients').doc(p.id).set({
      ...p,
      clinicId,
      registrationDate: new Date(Date.now() - 86400000 * 30).toISOString(),
      nextOfKin: {
        name: `Next of Kin (${p.surname})`,
        relation: "Spouse/Sibling",
        address: p.address,
        phone: p.phone
      }
    }, { merge: true });
  }

  // Refresh patients list
  const refreshedSnap = await db.collection('patients').where('clinicId', '==', clinicId).get();
  patients = refreshedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`✓ Total active clinic patient records available: ${patients.length}`);

  // =========================================================================
  // 4. SEED WARDS & BEDS
  // =========================================================================
  console.log(`\n--- Seeding Inpatient Wards & Beds ---`);

  const wardsData = [
    {
      id: `ward-${clinicId}-1`,
      name: "Male Medical Ward",
      type: "General",
      totalBeds: 8,
    },
    {
      id: `ward-${clinicId}-2`,
      name: "Female Surgical Ward",
      type: "Surgical",
      totalBeds: 8,
    },
    {
      id: `ward-${clinicId}-3`,
      name: "Intensive Care Unit (ICU)",
      type: "ICU",
      totalBeds: 6,
    },
    {
      id: `ward-${clinicId}-4`,
      name: "Maternity & Neonatal Unit",
      type: "Maternity",
      totalBeds: 6,
    }
  ];

  for (const w of wardsData) {
    await db.collection('wards').doc(w.id).set({
      id: w.id,
      clinicId,
      name: w.name,
      type: w.type,
      totalBeds: w.totalBeds,
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log(`  ✓ Ward created: ${w.name} (${w.totalBeds} beds, Type: ${w.type})`);

    // Create individual bed records for each ward
    for (let b = 1; b <= w.totalBeds; b++) {
      const bedId = `bed-${w.id}-${b}`;
      await db.collection('beds').doc(bedId).set({
        id: bedId,
        clinicId,
        wardId: w.id,
        bedNumber: `${w.name.split(' ')[0][0]}${b < 10 ? '0' + b : b}`,
        status: 'Available',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  }

  // =========================================================================
  // 5. SEED ACTIVE INPATIENT ADMISSIONS
  // =========================================================================
  console.log(`\n--- Seeding Active Inpatient Admissions ---`);

  // Clear previous admissions for clean, crisp screenshots
  const existingAdmissions = await db.collection('admissions').where('clinicId', '==', clinicId).get();
  for (const doc of existingAdmissions.docs) {
    await doc.ref.delete();
  }

  const admissionsToCreate = [
    {
      patient: patients[0] || defaultPatients[0],
      ward: wardsData[0], // Male Medical
      bedNumber: "M-01",
      bedId: `bed-${wardsData[0].id}-1`,
      reason: "Acute severe Plasmodium Falciparum Malaria with moderate dehydration",
      admittedHoursAgo: 4, // Admitted today!
    },
    {
      patient: patients[2] || defaultPatients[2],
      ward: wardsData[0], // Male Medical
      bedNumber: "M-03",
      bedId: `bed-${wardsData[0].id}-3`,
      reason: "Hypertensive urgency with refractory headache and epistaxis",
      admittedHoursAgo: 22,
    },
    {
      patient: patients[4] || defaultPatients[4],
      ward: wardsData[0], // Male Medical
      bedNumber: "M-05",
      bedId: `bed-${wardsData[0].id}-5`,
      reason: "Acute exacerbation of COPD with secondary bacterial bronchitis",
      admittedHoursAgo: 48,
    },
    {
      patient: patients[1] || defaultPatients[1],
      ward: wardsData[1], // Female Surgical
      bedNumber: "F-02",
      bedId: `bed-${wardsData[1].id}-2`,
      reason: "Post-operative monitoring: Day 1 status post Laparoscopic Appendectomy",
      admittedHoursAgo: 2, // Admitted today!
    },
    {
      patient: patients[3] || defaultPatients[3],
      ward: wardsData[1], // Female Surgical
      bedNumber: "F-04",
      bedId: `bed-${wardsData[1].id}-4`,
      reason: "Acute Cholecystitis scheduled for elective interval surgery",
      admittedHoursAgo: 36,
    },
    {
      patient: patients[5] || defaultPatients[5],
      ward: wardsData[1], // Female Surgical
      bedNumber: "F-06",
      bedId: `bed-${wardsData[1].id}-6`,
      reason: "Closed reduction of distal radius fracture under regional anesthesia",
      admittedHoursAgo: 14,
    },
    {
      patient: patients[0] || defaultPatients[0],
      ward: wardsData[2], // ICU
      bedNumber: "ICU-01",
      bedId: `bed-${wardsData[2].id}-1`,
      reason: "Unstable Angina / Non-ST elevation acute coronary syndrome telemetry",
      admittedHoursAgo: 6, // Admitted today!
    },
    {
      patient: patients[4] || defaultPatients[4],
      ward: wardsData[2], // ICU
      bedNumber: "ICU-02",
      bedId: `bed-${wardsData[2].id}-2`,
      reason: "Diabetic Ketoacidosis (DKA) undergoing IV regular insulin titration",
      admittedHoursAgo: 18,
    },
    {
      patient: patients[3] || defaultPatients[3],
      ward: wardsData[3], // Maternity
      bedNumber: "MAT-01",
      bedId: `bed-${wardsData[3].id}-1`,
      reason: "Term pregnancy in active labor stage 1 — fetal heart rate monitoring",
      admittedHoursAgo: 5, // Admitted today!
    },
    {
      patient: patients[1] || defaultPatients[1],
      ward: wardsData[3], // Maternity
      bedNumber: "MAT-03",
      bedId: `bed-${wardsData[3].id}-3`,
      reason: "Post-partum observation following uncomplicated vaginal delivery",
      admittedHoursAgo: 26,
    }
  ];

  for (let i = 0; i < admissionsToCreate.length; i++) {
    const adm = admissionsToCreate[i];
    const admissionId = `adm-${clinicId}-${i + 1}`;
    const admittedAt = new Date(Date.now() - adm.admittedHoursAgo * 3600000).toISOString();
    const patientFullName = `${adm.patient.firstName} ${adm.patient.surname}`;

    await db.collection('admissions').doc(admissionId).set({
      id: admissionId,
      clinicId,
      patientId: adm.patient.id,
      patientName: patientFullName,
      wardId: adm.ward.id,
      wardName: adm.ward.name,
      bedId: adm.bedId,
      bedNumber: adm.bedNumber,
      admittedBy: doctorName,
      admittedAt,
      reason: adm.reason,
      status: "Admitted"
    });

    // Update bed status to Occupied
    await db.collection('beds').doc(adm.bedId).set({
      status: "Occupied",
      patientId: adm.patient.id,
      patientName: patientFullName,
      updatedAt: admittedAt
    }, { merge: true });

    console.log(`  ✓ Admitted: ${patientFullName} -> ${adm.ward.name} (${adm.bedNumber})`);
  }

  // =========================================================================
  // 6. SEED PHARMACY DRUG INVENTORY (MEDICATIONS)
  // =========================================================================
  console.log(`\n--- Seeding Pharmacy Medications Formulary ---`);

  // Clear previous medications for fresh, clean catalog
  const existingMeds = await db.collection('medications').where('clinicId', '==', clinicId).get();
  for (const doc of existingMeds.docs) {
    await doc.ref.delete();
  }

  const medicationsList = [
    {
      name: "Amoxicillin-Clavulanate 625mg",
      genericName: "Co-Amoxiclav",
      category: "Antibiotics",
      stock: 45,
      unit: "tablets",
      price: 4800,
      expiryDate: "2027-08-15"
    },
    {
      name: "Ceftriaxone Sodium 1g IV",
      genericName: "Ceftriaxone",
      category: "Antibiotics",
      stock: 18,
      unit: "vials",
      price: 3500,
      expiryDate: "2027-11-20"
    },
    {
      name: "Azithromycin 500mg",
      genericName: "Azithromycin",
      category: "Antibiotics",
      stock: 32,
      unit: "tablets",
      price: 3200,
      expiryDate: "2027-06-30"
    },
    {
      name: "Amlodipine Besylate 10mg",
      genericName: "Amlodipine",
      category: "Antihypertensives",
      stock: 65,
      unit: "tablets",
      price: 2400,
      expiryDate: "2028-01-10"
    },
    {
      name: "Lisinopril 10mg",
      genericName: "Lisinopril",
      category: "Antihypertensives",
      stock: 50,
      unit: "tablets",
      price: 2100,
      expiryDate: "2027-09-12"
    },
    {
      name: "Atorvastatin Calcium 20mg",
      genericName: "Atorvastatin",
      category: "Cardiovascular",
      stock: 8, // Low Stock (< 10) - highlights red in UI
      unit: "tablets",
      price: 5200,
      expiryDate: "2027-04-18"
    },
    {
      name: "Artemether / Lumefantrine 80/480mg",
      genericName: "ACT Coartem",
      category: "Antimalarials",
      stock: 120,
      unit: "tablets",
      price: 2500,
      expiryDate: "2028-03-25"
    },
    {
      name: "Artesunate 60mg Injectable",
      genericName: "Artesunate IV",
      category: "Antimalarials",
      stock: 6, // Critical Low Stock - highlights red in UI
      unit: "vials",
      price: 4200,
      expiryDate: "2027-05-15"
    },
    {
      name: "Paracetamol Infusion 1000mg/100ml",
      genericName: "IV Acetaminophen",
      category: "Analgesics",
      stock: 24,
      unit: "bottles",
      price: 1800,
      expiryDate: "2028-02-14"
    },
    {
      name: "Ibuprofen 400mg",
      genericName: "Ibuprofen",
      category: "Analgesics",
      stock: 90,
      unit: "tablets",
      price: 1200,
      expiryDate: "2028-06-01"
    },
    {
      name: "Tramadol HCl 50mg",
      genericName: "Tramadol",
      category: "Analgesics",
      stock: 9, // Low Stock - highlights red in UI
      unit: "capsules",
      price: 3600,
      expiryDate: "2027-10-31"
    },
    {
      name: "Metformin Hydrochloride 500mg",
      genericName: "Metformin",
      category: "Antidiabetics",
      stock: 75,
      unit: "tablets",
      price: 1900,
      expiryDate: "2028-05-20"
    },
    {
      name: "Regular Soluble Insulin 100 IU/ml",
      genericName: "Humulin R",
      category: "Antidiabetics",
      stock: 14,
      unit: "vials",
      price: 8500,
      expiryDate: "2027-03-10"
    },
    {
      name: "Salbutamol Inhaler 100mcg",
      genericName: "Albuterol Inhaler",
      category: "Respiratory",
      stock: 28,
      unit: "canisters",
      price: 3800,
      expiryDate: "2027-12-15"
    },
    {
      name: "Omeprazole 20mg Delayed-Release",
      genericName: "Omeprazole",
      category: "Gastrointestinal",
      stock: 55,
      unit: "capsules",
      price: 2200,
      expiryDate: "2028-04-10"
    },
    {
      name: "Oral Rehydration Salts (ORS) Sachets",
      genericName: "Electrolyte replacement",
      category: "Consumables",
      stock: 150,
      unit: "sachets",
      price: 450,
      expiryDate: "2028-09-01"
    }
  ];

  for (let i = 0; i < medicationsList.length; i++) {
    const med = medicationsList[i];
    const medId = `med-${clinicId}-${i + 1}`;
    await db.collection('medications').doc(medId).set({
      id: medId,
      clinicId,
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      stock: med.stock,
      unit: med.unit,
      price: med.price,
      expiryDate: med.expiryDate,
      createdAt: new Date().toISOString()
    });
    console.log(`  ✓ Added Medication: ${med.name} (${med.stock} ${med.unit}, ₦${med.price})`);
  }

  // =========================================================================
  // 7. SEED PRESCRIPTIONS (PENDING & DISPENSED)
  // =========================================================================
  console.log(`\n--- Seeding Pharmacy Prescriptions Queue ---`);

  // Clear previous prescriptions
  const existingRx = await db.collection('prescriptions').where('clinicId', '==', clinicId).get();
  for (const doc of existingRx.docs) {
    await doc.ref.delete();
  }

  const prescriptionsToCreate = [
    {
      patient: patients[0] || defaultPatients[0],
      status: "Pending", // Displays active "Dispense Now" button
      dateMinutesAgo: 15, // Freshly prescribed today!
      medications: [
        { name: "Amoxicillin-Clavulanate 625mg", dosage: "625mg", frequency: "Twice daily (BD)", duration: "7 days", quantity: 14 },
        { name: "Paracetamol Infusion 1000mg/100ml", dosage: "1g IV", frequency: "Every 8 hours PRN", duration: "3 days", quantity: 6 }
      ],
      notes: "Severe febrile illness. Administer IV paracetamol stat then switch to oral Co-Amoxiclav with food."
    },
    {
      patient: patients[1] || defaultPatients[1],
      status: "Pending", // Displays active "Dispense Now" button
      dateMinutesAgo: 45,
      medications: [
        { name: "Ceftriaxone Sodium 1g IV", dosage: "1g", frequency: "Once daily (OD)", duration: "5 days", quantity: 5 },
        { name: "Tramadol HCl 50mg", dosage: "50mg", frequency: "Every 8 hours as needed", duration: "3 days", quantity: 9 }
      ],
      notes: "Post-operative surgical prophylaxis. Monitor for nausea."
    },
    {
      patient: patients[2] || defaultPatients[2],
      status: "Pending", // Displays active "Dispense Now" button
      dateMinutesAgo: 90,
      medications: [
        { name: "Amlodipine Besylate 10mg", dosage: "10mg", frequency: "Once daily in morning", duration: "30 days", quantity: 30 },
        { name: "Atorvastatin Calcium 20mg", dosage: "20mg", frequency: "Once daily at night", duration: "30 days", quantity: 30 }
      ],
      notes: "Cardiovascular risk reduction regimen. Review blood pressure in 2 weeks."
    },
    {
      patient: patients[3] || defaultPatients[3],
      status: "Pending", // Displays active "Dispense Now" button
      dateMinutesAgo: 150,
      medications: [
        { name: "Artemether / Lumefantrine 80/480mg", dosage: "1 tablet", frequency: "Twice daily (12 hours apart)", duration: "3 days", quantity: 6 },
        { name: "Ibuprofen 400mg", dosage: "400mg", frequency: "Three times daily after meals", duration: "5 days", quantity: 15 }
      ],
      notes: "Uncomplicated malaria confirmed via RDT. Take Artemether with fatty meal or milk for absorption."
    },
    {
      patient: patients[4] || defaultPatients[4],
      status: "Dispensed",
      dateMinutesAgo: 360, // 6 hours ago
      medications: [
        { name: "Metformin Hydrochloride 500mg", dosage: "500mg", frequency: "Twice daily with meals", duration: "60 days", quantity: 120 },
        { name: "Lisinopril 10mg", dosage: "10mg", frequency: "Once daily", duration: "30 days", quantity: 30 }
      ],
      notes: "Dispensed by Pharm. Chika. Patient counseled on adherence and diabetic foot care."
    },
    {
      patient: patients[5] || defaultPatients[5],
      status: "Dispensed",
      dateMinutesAgo: 720, // 12 hours ago
      medications: [
        { name: "Salbutamol Inhaler 100mcg", dosage: "2 puffs", frequency: "Every 4-6 hours PRN for wheezing", duration: "30 days", quantity: 1 },
        { name: "Azithromycin 500mg", dosage: "500mg", frequency: "Once daily", duration: "3 days", quantity: 3 }
      ],
      notes: "Inhaler technique demonstrated to patient. Spacer device provided."
    },
    {
      patient: patients[0] || defaultPatients[0],
      status: "Dispensed",
      dateMinutesAgo: 1440, // 1 day ago
      medications: [
        { name: "Omeprazole 20mg Delayed-Release", dosage: "20mg", frequency: "Once daily before breakfast", duration: "14 days", quantity: 14 }
      ],
      notes: "Gastric mucosal protection during oral anti-inflammatory therapy."
    }
  ];

  for (let i = 0; i < prescriptionsToCreate.length; i++) {
    const rx = prescriptionsToCreate[i];
    const rxId = `rx-${clinicId}-${i + 1}`;
    const patientFullName = `${rx.patient.firstName} ${rx.patient.surname}`;
    const rxDate = new Date(Date.now() - rx.dateMinutesAgo * 60000).toISOString();

    await db.collection('prescriptions').doc(rxId).set({
      id: rxId,
      clinicId,
      patientId: rx.patient.id,
      patientName: patientFullName,
      doctorId: uid,
      doctorName: doctorName,
      date: rxDate,
      medications: rx.medications,
      status: rx.status,
      notes: rx.notes
    });

    console.log(`  ✓ Prescription ${rxId} (${rx.status}): ${patientFullName} - ${rx.medications.map(m => m.name).join(', ')}`);
  }

  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS! WARD & PHARMACY DATA FULLY POPULATED!`);
  console.log(`Target User: ${targetEmail}`);
  console.log(`Clinic: Safeway Elite Clinical Research Hospital (${clinicId})`);
  console.log(`- 4 Wards created (28 total beds)`);
  console.log(`- 10 Active Inpatient Admissions populated across all wards`);
  console.log(`- 16 Pharmaceutical Medications populated in Drug Store`);
  console.log(`- 7 Detailed Prescriptions created (4 Pending with "Dispense Now" buttons + 3 Dispensed)`);
  console.log(`========================================\n`);
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("Seeding Error:", err);
  process.exit(1);
});
