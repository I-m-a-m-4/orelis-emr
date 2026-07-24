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

const mockEncountersData = [
  {
    type: 'Consultation',
    status: 'Finalized',
    soap: {
      subjective: 'Patient reports persistent dry cough and mild sore throat for the past 4 days. Feels fatigued but denies chest pain or shortness of breath. No history of recent travel.',
      objective: 'Chest is clear on auscultation. Mild pharyngeal erythema noted. Vitals: Temp 36.8°C, BP 118/76 mmHg, HR 74 bpm, SpO2 97%.',
      assessment: '1. Acute pharyngitis, likely viral.\n2. Mild physical fatigue.',
      plan: '1. Warm saline gargles 3-4 times daily.\n2. Tab Paracetamol 500mg as needed for throat discomfort.\n3. Increase oral hydration and rest.'
    },
    vitals: [
      { id: 'v1', type: 'temperature', value: '36.8', unit: '°C', timestamp: new Date().toISOString() },
      { id: 'v2', type: 'blood_pressure', value: '118/76', unit: 'mmHg', timestamp: new Date().toISOString() },
      { id: 'v3', type: 'heart_rate', value: '74', unit: 'bpm', timestamp: new Date().toISOString() }
    ],
    prescriptions: ['Tab Paracetamol 500mg tds x 3 days', 'Warm saline gargles qid']
  },
  {
    type: 'Follow-up',
    status: 'Finalized',
    soap: {
      subjective: 'Returned for routine evaluation. Cough has resolved completely. Sore throat resolved. Energy levels returned to baseline.',
      objective: 'Throat examination is normal. Lungs clear. Vitals: Temp 36.5°C, BP 120/80 mmHg, HR 72 bpm, SpO2 99%.',
      assessment: '1. Resolved acute pharyngitis.',
      plan: '1. Discontinue all temporary medications.\n2. Resume normal physical activities.'
    },
    vitals: [
      { id: 'v1', type: 'temperature', value: '36.5', unit: '°C', timestamp: new Date().toISOString() },
      { id: 'v2', type: 'blood_pressure', value: '120/80', unit: 'mmHg', timestamp: new Date().toISOString() },
      { id: 'v3', type: 'heart_rate', value: '72', unit: 'bpm', timestamp: new Date().toISOString() }
    ],
    prescriptions: []
  }
];

async function populate() {
  console.log("Fetching patients from Firestore...");
  const patientsSnapshot = await db.collection('patients').get();
  
  if (patientsSnapshot.empty) {
    console.log("No patients found in Firestore.");
    return;
  }
  
  console.log(`Found ${patientsSnapshot.size} patients. Populating mock SOAP notes...`);
  
  for (const patientDoc of patientsSnapshot.docs) {
    const patientData = patientDoc.data();
    const patientId = patientDoc.id;
    const clinicId = patientData.clinicId || 'clinic-default';
    const patientName = `${patientData.firstName || ''} ${patientData.surname || ''}`.trim() || 'Unknown Patient';
    
    // Check if patient already has encounters
    const encountersSnapshot = await db.collection('encounters')
      .where('patientId', '==', patientId)
      .limit(1)
      .get();
      
    if (!encountersSnapshot.empty) {
      console.log(`Patient ${patientName} (${patientId}) already has encounters. Skipping...`);
      continue;
    }
    
    console.log(`Adding ${mockEncountersData.length} mock encounters for ${patientName}...`);
    
    // Add mock encounters with staggered dates
    for (let i = 0; i < mockEncountersData.length; i++) {
      const mockEnc = mockEncountersData[i];
      const encounterDate = new Date();
      // Stagger dates: first encounter is 7 days ago, second is 2 days ago
      encounterDate.setDate(encounterDate.getDate() - (7 - i * 5));
      
      const encData = {
        clinicId: clinicId,
        patientId: patientId,
        patientName: patientName,
        doctorId: 'doctor-default',
        doctorName: 'Dr. Orelis Intelligence',
        date: encounterDate.toISOString(),
        type: mockEnc.type,
        status: mockEnc.status,
        soap: mockEnc.soap,
        vitals: mockEnc.vitals,
        prescriptions: mockEnc.prescriptions
      };
      
      await db.collection('encounters').add(encData);
    }
  }
  
  console.log("SOAP note population completed successfully!");
}

populate().catch(err => {
  console.error("Error populating database:", err);
  process.exit(1);
});
