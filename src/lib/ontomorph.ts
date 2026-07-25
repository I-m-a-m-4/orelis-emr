// Helper to interact with Ontomorph SDK and HOLON Knowledge Base
import { DTP } from "@ontomorph/dtp-sdk";
import { createHolonClient } from "@ontomorph/holon-client";

const DTP_KEY = process.env.NEXT_PUBLIC_DTP_KEY || process.env.DTP_KEY;
const HOLON_KEY = process.env.NEXT_PUBLIC_HOLON_KEY || process.env.HOLON_KEY || DTP_KEY;

// Lazy initialization or fallback mock implementation
let dtpInstance: any = null;
let holonInstance: any = null;

export function getDTP() {
  if (!DTP_KEY) {
    console.warn("Ontomorph DTP API key is not configured. Running in mock/demo mode.");
    return null;
  }
  if (!dtpInstance) {
    try {
      dtpInstance = new DTP({ apiKey: DTP_KEY });
    } catch (err) {
      console.error("Failed to initialize Ontomorph DTP SDK:", err);
    }
  }
  return dtpInstance;
}

export function getHolon() {
  if (!HOLON_KEY) {
    return null;
  }
  if (!holonInstance) {
    try {
      holonInstance = createHolonClient({ 
        apiKey: HOLON_KEY, 
        apiUrl: process.env.NEXT_PUBLIC_HOLON_API_URL || "https://api.ontomorph.com/holon"
      });
    } catch (err) {
      console.error("Failed to initialize HOLON Client:", err);
    }
  }
  return holonInstance;
}

// Mock database of twin details and system telemetry for UI/presentation stability
export const MOCK_TWIN_SYSTEMS = {
  cardiovascular: {
    status: "normal",
    signals: [
      { code: "HR", name: "Heart Rate", value: "72", unit: "bpm", timestamp: new Date().toISOString() },
      { code: "BP_SYS", name: "Systolic BP", value: "118", unit: "mmHg", timestamp: new Date().toISOString() },
      { code: "BP_DIA", name: "Diastolic BP", value: "76", unit: "mmHg", timestamp: new Date().toISOString() },
      { code: "LDL", name: "LDL Cholesterol", value: "115", unit: "mg/dL", timestamp: new Date().toISOString() },
      { code: "HDL", name: "HDL Cholesterol", value: "48", unit: "mg/dL", timestamp: new Date().toISOString() },
    ]
  },
  metabolic: {
    status: "warning",
    signals: [
      { code: "GLU", name: "Fasting Glucose", value: "105", unit: "mg/dL", timestamp: new Date().toISOString() },
      { code: "A1C", name: "HbA1c", value: "5.8", unit: "%", timestamp: new Date().toISOString() },
      { code: "BMI", name: "Body Mass Index", value: "26.4", unit: "kg/m²", timestamp: new Date().toISOString() },
    ]
  },
  respiratory: {
    status: "normal",
    signals: [
      { code: "SPO2", name: "Oxygen Saturation", value: "98", unit: "%", timestamp: new Date().toISOString() },
      { code: "RR", name: "Respiratory Rate", value: "14", unit: "pm", timestamp: new Date().toISOString() },
    ]
  }
};

// Mock Drug safety checker interaction database
export const MOCK_DRUG_INTERACTIONS: Record<string, Array<{ severity: "High" | "Moderate" | "Minor"; description: string; source: string }>> = {
  "Aspirin + Warfarin": [
    {
      severity: "High",
      description: "Co-administration of aspirin and warfarin increases the risk of serious bleeding events due to additive antiplatelet and anticoagulant effects.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Ibuprofen + Lisinopril": [
    {
      severity: "Moderate",
      description: "NSAIDs like ibuprofen may decrease the antihypertensive effect of ACE inhibitors like lisinopril and increase the risk of renal impairment.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Simvastatin + Amlodipine": [
    {
      severity: "Moderate",
      description: "Amlodipine may increase the plasma concentration of simvastatin, elevating the risk of myopathy and rhabdomyolysis.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Sildenafil + Nitroglycerin": [
    {
      severity: "High",
      description: "Critical hypotension risk. Nitrates like nitroglycerin dilate blood vessels, and sildenafil amplifies this effect, potentially causing a dangerous drop in blood pressure.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Warfarin + Ibuprofen": [
    {
      severity: "High",
      description: "NSAIDs like ibuprofen increase gastrointestinal bleeding risk and interfere with platelet aggregation, significantly raising bleeding risk when combined with warfarin.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Metoprolol + Albuterol": [
    {
      severity: "Moderate",
      description: "Metoprolol is a beta-blocker that can antagonize the bronchodilating effects of beta-agonists like albuterol, potentially causing bronchospasm in susceptible patients.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Sertraline + Tramadol": [
    {
      severity: "High",
      description: "Co-administration increases the risk of Serotonin Syndrome, a potentially life-threatening condition characterized by mental status changes, neuromuscular hyperactivity, and autonomic instability.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Clopidogrel + Omeprazole": [
    {
      severity: "Moderate",
      description: "Omeprazole is a CYP2C19 inhibitor that can reduce the bioactivation and antiplatelet efficacy of clopidogrel, potentially increasing cardiovascular events.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Lisinopril + Spironolactone": [
    {
      severity: "Moderate",
      description: "Combining an ACE inhibitor with a potassium-sparing diuretic increases the risk of hyperkalemia. Close monitoring of serum potassium and renal function is advised.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Warfarin + Azithromycin": [
    {
      severity: "Moderate",
      description: "Macrolide antibiotics like azithromycin can alter intestinal flora and inhibit warfarin metabolism, potentially prolonging the prothrombin time (INR).",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ],
  "Atorvastatin + Clarithromycin": [
    {
      severity: "High",
      description: "Clarithromycin is a strong CYP3A4 inhibitor that can significantly increase atorvastatin exposure, leading to an elevated risk of myopathy or rhabdomyolysis.",
      source: "HOLON Drug-Interaction DB (v5.3)"
    }
  ]
};

// Mock LOINC codes for lab report explainer
export const MOCK_LOINC_CONCEPTS: Record<string, { name: string; range: string; explanation: string; status: string }> = {
  "2339-0": {
    name: "Glucose [Mass/volume] in Blood",
    range: "70 - 99 mg/dL",
    explanation: "Measures the sugar levels in your blood. Your level of 105 mg/dL is slightly elevated, indicating a pre-diabetic metabolic profile.",
    status: "Mildly Elevated"
  },
  "18262-6": {
    name: "Cholesterol in LDL [Mass/volume] in Serum or Plasma",
    range: "< 100 mg/dL",
    explanation: "Known as 'bad' cholesterol. Levels higher than 100 increase cardivascular risk. Your level is 115 mg/dL, which is within the borderline range.",
    status: "Borderline High"
  },
  "4544-3": {
    name: "Hemoglobin A1c/Hemoglobin.total in Blood",
    range: "< 5.7 %",
    explanation: "Indicates average blood sugar over past 3 months. Values between 5.7% and 6.4% signify pre-diabetes.",
    status: "Mildly Elevated"
  }
};
