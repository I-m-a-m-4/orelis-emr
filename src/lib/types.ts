
import type { LucideIcon } from "lucide-react";
import type { Timestamp } from "firebase/firestore";

export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'patient';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId?: string;
  patientId?: string;
  status: 'pending' | 'active';
  country?: string;
  apiConfig?: {
    apiKey: string;
    quotaLimit: number;
    quotaUsed: number;
    tier: 'Free' | 'Pro' | 'Enterprise';
    lastGenerated?: string;
  };
}

export interface Patient {
  id: string; // This will be the Firestore document ID
  clinicId: string;
  patientCode: string; // Secure code for linking patient account
  surname: string;
  firstName: string;
  sex: 'Male' | 'Female' | 'Other';
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  address: string;
  dob: string; // ISO string
  origin: string;
  tribe: string;
  occupation: string;
  phone: string;
  email?: string;
  country?: string;
  notes?: string;
  nextOfKin: {
    name: string;
    relation: string;
    address: string;
    phone: string;
  };
  registrationDate: string; // ISO string
  lastVisit?: string; // ISO string
  status?: 'Active' | 'Inactive';
  [key: string]: any; // Allow custom fields
}


export interface Staff extends UserProfile { }

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string; // ISO string
  reason: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  superAdmin?: boolean;
}

export interface OperatingHours {
  open: string; // HH:mm
  close: string; // HH:mm
  isClosed: boolean;
}

export interface Clinic {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  country?: string;
  staffCount?: number;
  specialties?: string[];
  subscription?: {
    plan: 'price_annual' | 'trial' | 'infinite';
    status: 'active' | 'trialing' | 'expired';
    customerId?: string;
    expiryDate?: string | null; // ISO string
  };
  apiConfig?: {
    apiKey: string;
    quotaLimit: number; // e.g., 1000 requests/month
    quotaUsed: number;
    tier: 'Free' | 'Pro' | 'Enterprise';
  };
  operatingHours?: {
    monday: OperatingHours;
    tuesday: OperatingHours;
    wednesday: OperatingHours;
    thursday: OperatingHours;
    friday: OperatingHours;
    saturday: OperatingHours;
    sunday: OperatingHours;
  };
}

export interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  featuredImage?: string;
  authorId: string;
  authorName: string;
  clinicId?: string;
  publishedAt: string | null;
  updatedAt: string;
  status: 'draft' | 'published';
  metaDescription?: string;
}

export interface Notification {
  id: string;
  userId: string;
  clinicId?: string;
  title: string;
  message: string;
  type: 'subscription' | 'announcement' | 'info' | 'welcome' | 'warning';
  read: boolean;
  timestamp: string; // ISO string
  link?: string;
}

export interface Broadcast extends Notification {
  target: 'all' | string; // 'all' or a specific clinicId
}

export interface WaitlistEntry {
  id: string;
  email: string;
  timestamp: Timestamp;
}
export interface Observation {
  id: string;
  type: 'temperature' | 'blood_pressure' | 'heart_rate' | 'respiratory_rate' | 'weight' | 'height' | 'bmi' | 'oxygen_saturation';
  value: string;
  unit: string;
  timestamp: string;
}

export interface SOAPNote {
  subjective: string; // Patient's complaints & history
  objective: string;  // Physical exam & vitals summary
  assessment: string; // Diagnosis / Impression
  plan: string;       // Treatment, Meds, Follow-up
}

export interface Encounter {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  type: 'Consultation' | 'Follow-up' | 'Emergency' | 'Routine';
  diagnosis?: string; // e.g. "Malaria", "Hypertension"
  soap: SOAPNote;
  vitals?: Observation[];
  status: 'Draft' | 'Finalized';
  prescriptions?: string[]; // IDs or text
  labOrders?: string[];     // IDs or text
}
export interface Prescription {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }[];
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  notes?: string;
}

export interface Medication {
  id: string;
  clinicId: string;
  name: string;
  genericName?: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  expiryDate?: string;
}

export interface Ward {
  id: string;
  clinicId: string;
  name: string;
  type: string; // e.g. General, Private, ICU
  totalBeds: number;
}

export interface Bed {
  id: string;
  clinicId: string;
  wardId: string;
  bedNumber: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
  patientName?: string;
}

export interface Admission {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  admittedBy: string;
  admittedAt: string;
  dischargedAt?: string;
  reason: string;
  status: 'Admitted' | 'Discharged';
}
export interface LabOrder {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  testType: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  requestedBy: string;
  requestedAt: string;
  results?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
}

export interface WaitlistEntry {
  id: string;
  clinicId: string;
  patientName: string;
  phone: string;
  serviceRequested: string;
  priority: 'Normal' | 'High';
  joinedAt: string;
  status: 'Waiting' | 'Called' | 'Seen' | 'Removed';
}

export interface Purchase {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  productName: string;
  amount: number;
  category: 'Pharmacy' | 'Retail' | 'Service';
  date: string; // ISO string
  source: string; // e.g. "Orelis-Integrated"
}
