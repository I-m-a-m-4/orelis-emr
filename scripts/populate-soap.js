require('dotenv').config();
const admin = require('firebase-admin');

// Parse the private key from the environment variable
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  console.error("Missing Firebase Admin environment variables in .env file.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  })
});

const db = admin.firestore();

// Detailed, realistic clinical histories tailored to patient profiles
const clinicalHistories = {
  'Okafor Chinedu': [
    {
      type: 'Initial Cardiology Consultation',
      status: 'Finalized',
      soap: {
        subjective: `Patient presented with a history of recurrent chest tightness and exertional dyspnea over the last 3 weeks. He describes the tightness as a dull pressure-like sensation radiating to his left shoulder, primarily triggered by climbing stairs or fast walking. The discomfort typically resolves with 5–10 minutes of complete rest. He denies any associated orthopnea, paroxysmal nocturnal dyspnea, syncope, or palpitation. He has a known history of mild essential hypertension, managed with daily amlodipine, and a family history of coronary artery disease (father had myocardial infarction at age 58).`,
        objective: `On physical examination, the patient appears well-developed and in no acute distress. Chest is symmetrical with normal respiratory excursion; lungs are completely clear to auscultation bilaterally. Cardiac exam reveals a regular rate and rhythm with normal S1 and S2; no murmurs, gallops, or rubs are appreciated. No jugular venous distention (JVD) or peripheral edema is noted in the lower extremities. Vitals: Temperature 36.6°C, Blood Pressure 138/84 mmHg, Heart Rate 78 bpm, SpO2 98%.`,
        assessment: `1. Exertional angina pectoris, highly suspicious for stable coronary artery disease.\n2. Borderline controlled essential hypertension.`,
        plan: `1. Ordered a 12-lead electrocardiogram (ECG) and referred to cardiology for an outpatient exercise stress echocardiogram.\n2. Prescribed Sublingual Nitroglycerin 0.4mg tablets to be taken as needed for acute chest discomfort.\n3. Instructed patient to report immediately to the nearest emergency department if chest pain becomes crushing, lasts longer than 15 minutes, or is accompanied by sweating and nausea.`
      },
      vitals: [
        { id: 'v1', type: 'temperature', value: '36.6', unit: '°C', timestamp: new Date().toISOString() },
        { id: 'v2', type: 'blood_pressure', value: '138/84', unit: 'mmHg', timestamp: new Date().toISOString() },
        { id: 'v3', type: 'heart_rate', value: '78', unit: 'bpm', timestamp: new Date().toISOString() }
      ],
      prescriptions: ['Tab Nitroglycerin 0.4mg sublingual prn x 30 days', 'Tab Amlodipine 5mg daily (continued)']
    },
    {
      type: 'Cardiology Follow-Up',
      status: 'Finalized',
      soap: {
        subjective: `Patient returns for evaluation following his stress echo. He reports that he has experienced only one brief episode of mild chest pressure since his initial visit, which occurred while walking uphill. He utilized one sublingual nitroglycerin tablet, which provided relief within 3 minutes. He denies any side effects from the medication. He has been adherent to his low-sodium diet and has started taking brief, flat walks daily as advised.`,
        objective: `Patient is calm and hemodynamically stable. Blood pressure is improved today. Lungs remain clear. Normal heart sounds with no murmurs. Vitals: Temperature 36.5°C, Blood Pressure 124/78 mmHg, Heart Rate 68 bpm, SpO2 99%. Stress echo report reviewed: shows mild inducible ischemia in the LAD territory, LVEF preserved at 55%.`,
        assessment: `1. Stable coronary artery disease with mild inducible anterior ischemia.\n2. Adequately controlled hypertension.`,
        plan: `1. Initiate Low-dose Aspirin 81mg daily and Atorvastatin 20mg daily for cardioprotection and lipid management.\n2. Continue sublingual nitroglycerin for emergency use.\n3. Follow up in 3 months with a repeat lipid profile.`
      },
      vitals: [
        { id: 'v1', type: 'temperature', value: '36.5', unit: '°C', timestamp: new Date().toISOString() },
        { id: 'v2', type: 'blood_pressure', value: '124/78', unit: 'mmHg', timestamp: new Date().toISOString() },
        { id: 'v3', type: 'heart_rate', value: '68', unit: 'bpm', timestamp: new Date().toISOString() }
      ],
      prescriptions: ['Tab Aspirin 81mg daily', 'Tab Atorvastatin 20mg daily', 'Tab Nitroglycerin 0.4mg prn']
    }
  ],
  'Ademola Idris': [
    {
      type: 'General Medical Examination',
      status: 'Finalized',
      soap: {
        subjective: `Patient presented for a comprehensive annual physical check-up. He reports feeling generally well but notes mild, intermittent lower back stiffness, particularly in the mornings or after prolonged sitting at his desk. He denies any radiating leg pain, numbness, tingling, or bowel/bladder dysfunction. He exercises twice a week (light jogging) and has a moderate caffeine intake. Diet is mixed with high processed food intake. He has no significant past surgical history.`,
        objective: `Physical exam reveals a healthy-appearing male. Musculoskeletal evaluation shows full range of motion of the lumbar spine, though with mild tightness in the bilateral hamstrings. Straight leg raise test is negative bilaterally. Paraspinal muscles show mild tenderness to palpation in the lower lumbar region, but no spasm. Neurological exam is intact with normal patellar and Achilles reflexes, and 5/5 motor strength in all lower extremity muscle groups. Vitals: Temperature 36.7°C, Blood Pressure 118/74 mmHg, Heart Rate 64 bpm, SpO2 98%.`,
        assessment: `1. Mechanical lower back pain, secondary to postural strain.\n2. Routine health maintenance.`,
        plan: `1. Advised on ergonomic workspace modifications, including supportive seating and frequent standing breaks.\n2. Recommended physical therapy exercises focusing on core strengthening and hamstring stretches.\n3. Prescribed Ibuprofen 400mg as needed for acute stiffness or pain (not to exceed 1200mg/day).`
      },
      vitals: [
        { id: 'v1', type: 'temperature', value: '36.7', unit: '°C', timestamp: new Date().toISOString() },
        { id: 'v2', type: 'blood_pressure', value: '118/74', unit: 'mmHg', timestamp: new Date().toISOString() },
        { id: 'v3', type: 'heart_rate', value: '64', unit: 'bpm', timestamp: new Date().toISOString() }
      ],
      prescriptions: ['Tab Ibuprofen 400mg prn x 10 days']
    }
  ],
  'Amina Suleiman': [
    {
      type: 'Endocrinology Consultation',
      status: 'Finalized',
      soap: {
        subjective: `Patient presented with complaints of progressive fatigue, unexplained weight gain of 4 kg over the past 3 months, dry skin, and increased sensitivity to cold. She notes that her menstrual cycles have become somewhat irregular and heavier. She denies any neck pain, dysphagia, palpitations, or tremors. She has no family history of thyroid disease.`,
        objective: `Examination shows a pleasant female with noticeably dry skin and thinning hair. Thyroid gland is palpated; it is minimally enlarged, symmetric, non-tender, and without discrete nodules. Reflexes show a delayed relaxation phase in the Achilles tendon. Vitals: Temperature 36.2°C, Blood Pressure 110/70 mmHg, Heart Rate 58 bpm, SpO2 98%.`,
        assessment: `1. Clinical hypothyroidism, suspecting Hashimoto's thyroiditis.`,
        plan: `1. Ordered thyroid panel (TSH, Free T4) and anti-TPO antibodies.\n2. Scheduled patient for a follow-up visit in 1 week to review lab results and initiate thyroid hormone replacement therapy.`
      },
      vitals: [
        { id: 'v1', type: 'temperature', value: '36.2', unit: '°C', timestamp: new Date().toISOString() },
        { id: 'v2', type: 'blood_pressure', value: '110/70', unit: 'mmHg', timestamp: new Date().toISOString() },
        { id: 'v3', type: 'heart_rate', value: '58', unit: 'bpm', timestamp: new Date().toISOString() }
      ],
      prescriptions: []
    }
  ]
};

// Fallback template for patients not explicitly defined
const defaultNotes = [
  {
    type: 'Outpatient Consultation',
    status: 'Finalized',
    soap: {
      subjective: `Patient presented with a history of mild, dry, irritating cough and nasal congestion for the past 5 days. Describes symptoms as worsening in the evening. Reports mild pressure in the forehead and sinuses, but denies high fever, chills, body aches, or shortness of breath. No known sick contacts. Over-the-counter saline sprays have provided minimal temporary relief.`,
      objective: `General appearance is healthy and active. Ear canal is clear, tympanic membrane intact. Nasal mucosa shows moderate congestion and erythema, with clear watery discharge. Posterior pharynx shows mild cobblestoning but no exudate. Lungs are clear to auscultation bilaterally. Sinus tenderness to palpation over the maxillary sinuses. Vitals: Temperature 36.8°C, Blood Pressure 120/80 mmHg, Heart Rate 72 bpm, SpO2 99%.`,
      assessment: `1. Acute viral rhinosinusitis.\n2. Post-nasal drip triggering dry cough.`,
      plan: `1. Recommended supportive care, including saline nasal rinses twice daily and increased warm fluid intake.\n2. Prescribed Loratadine 10mg daily for allergic/congestive symptoms.\n3. Instructed patient to return if symptoms persist beyond 10 days or if high fever develops.`
    },
    vitals: [
      { id: 'v1', type: 'temperature', value: '36.8', unit: '°C', timestamp: new Date().toISOString() },
      { id: 'v2', type: 'blood_pressure', value: '120/80', unit: 'mmHg', timestamp: new Date().toISOString() },
      { id: 'v3', type: 'heart_rate', value: '72', unit: 'bpm', timestamp: new Date().toISOString() }
    ],
    prescriptions: ['Tab Loratadine 10mg daily x 7 days']
  }
];

async function populate() {
  console.log("Fetching patients from Firestore...");
  const patientsSnapshot = await db.collection('patients').get();
  
  if (patientsSnapshot.empty) {
    console.log("No patients found.");
    return;
  }
  
  console.log(`Found ${patientsSnapshot.size} patients. Re-populating detailed SOAP encounters...`);
  
  for (const patientDoc of patientsSnapshot.docs) {
    const patientData = patientDoc.data();
    const patientId = patientDoc.id;
    const clinicId = patientData.clinicId || 'clinic-default';
    const patientName = `${patientData.firstName || ''} ${patientData.surname || ''}`.trim();
    
    console.log(`Clearing existing encounters for ${patientName} (${patientId})...`);
    // Delete existing encounters for clean slate
    const existingEncounters = await db.collection('encounters')
      .where('patientId', '==', patientId)
      .get();
      
    const batch = db.batch();
    existingEncounters.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    const mockEncounters = clinicalHistories[patientName] || defaultNotes;
    console.log(`Adding ${mockEncounters.length} detailed encounters for ${patientName}...`);
    
    for (let i = 0; i < mockEncounters.length; i++) {
      const mockEnc = mockEncounters[i];
      const encounterDate = new Date();
      // Stagger dates
      encounterDate.setDate(encounterDate.getDate() - (15 - i * 8));
      
      // Combine SOAP fields into a single long subjective text since we are moving away from rigid SOAP boxes
      const unifiedNoteText = `${mockEnc.soap.subjective}\n\n${mockEnc.soap.objective}\n\n${mockEnc.soap.assessment}\n\n${mockEnc.soap.plan}`;
      
      const encData = {
        clinicId: clinicId,
        patientId: patientId,
        patientName: patientName,
        doctorId: 'doctor-default',
        doctorName: 'Dr. Orelis Intelligence',
        date: encounterDate.toISOString(),
        type: mockEnc.type,
        status: mockEnc.status,
        soap: {
          subjective: unifiedNoteText, // Put the complete formatted note here
          objective: '',
          assessment: '',
          plan: ''
        },
        vitals: mockEnc.vitals,
        prescriptions: mockEnc.prescriptions
      };
      
      await db.collection('encounters').add(encData);
    }
  }
  
  console.log("Personalized, highly-detailed encounters population completed successfully!");
}

populate().catch(err => {
  console.error("Error populating database:", err);
  process.exit(1);
});
