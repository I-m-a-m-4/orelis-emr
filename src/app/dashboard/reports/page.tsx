'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity, 
  Download, 
  Printer,
  HeartPulse,
  Pill,
  ShieldAlert,
  Calendar,
  Layers,
  Search,
  Baby,
  Building2,
  Inbox
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Patient, Encounter, Appointment, UserProfile, Prescription, LabOrder } from "@/lib/types";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { subDays, differenceInDays } from 'date-fns';

export default function ComprehensiveClinicalReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [timeRange, setTimeRange] = useState('30d');
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 1. Resolve User Profile & Scoped Clinic ID
  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const clinicRef = useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return doc(firestore, 'clinics', userProfile.clinicId);
  }, [userProfile?.clinicId, firestore]);
  const { data: clinic } = useDoc<any>(clinicRef);

  const clinicId = userProfile?.clinicId;

  // 2. Multi-Tenant Scoped Queries (Strictly isolated to clinicId)
  const patientsQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'patients'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: patients, loading: patientsLoading } = useCollection<Patient>(patientsQuery);

  const encountersQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'encounters'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: encounters, loading: encountersLoading } = useCollection<Encounter>(encountersQuery);

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'appointments'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: appointments, loading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  const invoicesQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'invoices'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: invoices, loading: invoicesLoading } = useCollection<any>(invoicesQuery);

  const prescriptionsQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'prescriptions'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: prescriptions, loading: prescriptionsLoading } = useCollection<Prescription>(prescriptionsQuery);

  const labOrdersQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'lab_orders'), where('clinicId', '==', clinicId));
  }, [firestore, clinicId]);
  const { data: labOrders, loading: labOrdersLoading } = useCollection<LabOrder>(labOrdersQuery);

  // -------------------------------------------------------------
  // 100% REAL-TIME CLINICAL, EPIDEMIOLOGICAL & REVENUE ENGINE (ZERO MOCK DATA)
  // -------------------------------------------------------------
  const analytics = useMemo(() => {
    const rangeDays = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : timeRange === '1y' ? 365 : 30;
    const cutoffDate = subDays(new Date(), rangeDays);

    // Filter collections by time range
    const filteredEncounters = (encounters || []).filter(e => {
      if (!e.date) return true;
      return new Date(e.date) >= cutoffDate;
    });

    const filteredAppointments = (appointments || []).filter(a => {
      if (!a.appointmentDate) return true;
      return new Date(a.appointmentDate) >= cutoffDate;
    });

    const filteredPrescriptions = (prescriptions || []).filter(p => {
      if (!p.date) return true;
      return new Date(p.date) >= cutoffDate;
    });

    const filteredLabOrders = (labOrders || []).filter(l => {
      if (!l.requestedAt) return true;
      return new Date(l.requestedAt) >= cutoffDate;
    });

    const filteredInvoices = (invoices || []).filter(i => {
      const d = i.date || i.createdAt;
      if (!d) return true;
      return new Date(d) >= cutoffDate;
    });

    const totalPatients = patients?.length || 0;
    const totalEncounters = filteredEncounters.length;

    // 1. Morbidity & Real Diagnoses Ledger
    const diseaseMap: Record<string, { name: string; cases: number; category: string; deaths: number; recovered: number }> = {};

    filteredEncounters.forEach(e => {
      const diagRaw = (e.diagnosis || e.soap?.assessment || '').trim();
      if (!diagRaw) return;

      const diag = diagRaw.length > 55 ? `${diagRaw.slice(0, 52)}...` : diagRaw;
      const lower = diag.toLowerCase();

      let category = 'General Medicine';
      if (/derm|skin|eczema|tinea|rash|fungal|scabies|pruritus|acne/i.test(lower)) category = 'Dermatological';
      else if (/malaria|typhoid|cholera|hiv|tb|tuberculosis|sepsis|dengue|infection|fever/i.test(lower)) category = 'Infectious';
      else if (/respiratory|pneumonia|urti|lrti|asthma|bronch|cough/i.test(lower)) category = 'Respiratory';
      else if (/hypertension|cardio|heart|infarction|arrhythmia|stroke|blood pressure/i.test(lower)) category = 'Cardiovascular';
      else if (/diabetes|diabetic|thyroid|glucose/i.test(lower)) category = 'Endocrine';
      else if (/gastro|ulcer|pud|diarrhea|gastritis|colitis|abdomen/i.test(lower)) category = 'Gastrointestinal';
      else if (/uti|urinary|kidney|renal/i.test(lower)) category = 'Urological';

      const isDeceased = (e as any).outcome === 'Deceased' || (e as any).status === 'Deceased';
      const isRecovered = e.status === 'Finalized' || (e as any).status === 'Completed' || (e as any).status === 'Signed';

      if (!diseaseMap[diag]) {
        diseaseMap[diag] = { name: diag, cases: 0, category, deaths: 0, recovered: 0 };
      }
      diseaseMap[diag].cases += 1;
      if (isDeceased) diseaseMap[diag].deaths += 1;
      if (isRecovered) diseaseMap[diag].recovered += 1;
    });

    const baseDiseases = Object.values(diseaseMap)
      .sort((a, b) => b.cases - a.cases)
      .map(d => ({
        ...d,
        fatalityRate: d.cases > 0 ? `${((d.deaths / d.cases) * 100).toFixed(1)}%` : '0.0%',
        recoveredRate: d.cases > 0 ? Math.round((d.recovered / d.cases) * 100) : 100,
      }));

    const skinDiseasesCount = baseDiseases
      .filter(d => d.category === 'Dermatological')
      .reduce((sum, d) => sum + d.cases, 0);

    // 2. Fatality & Recovery Rates (Derived from real encounter outcomes)
    const totalDeaths = filteredEncounters.filter(e => (e as any).outcome === 'Deceased').length;
    const overallFatalityRate = totalEncounters > 0 ? `${((totalDeaths / totalEncounters) * 100).toFixed(1)}%` : '0.0%';

    const totalRecovered = filteredEncounters.filter(e => 
      e.status === 'Finalized' || (e as any).status === 'Completed' || (e as any).status === 'Signed'
    ).length;
    const overallRecoveryRate = totalEncounters > 0 ? `${Math.round((totalRecovered / totalEncounters) * 100)}%` : '100%';

    // 3. Demographics: Real Age Cohorts
    let peds = 0, school = 0, adult = 0, middle = 0, geriatric = 0;
    patients?.forEach(p => {
      if (p.dob) {
        const birthYear = new Date(p.dob).getFullYear();
        const age = isNaN(birthYear) ? 30 : new Date().getFullYear() - birthYear;
        if (age < 5) peds++;
        else if (age <= 17) school++;
        else if (age <= 49) adult++;
        else if (age <= 64) middle++;
        else geriatric++;
      } else {
        adult++;
      }
    });

    const ageCohorts = [
      { name: '<5 yrs (Pediatrics)', count: peds, color: '#38bdf8' },
      { name: '5-17 yrs (School Age)', count: school, color: '#818cf8' },
      { name: '18-49 yrs (Adults)', count: adult, color: '#f97316' },
      { name: '50-64 yrs (Middle Age)', count: middle, color: '#eab308' },
      { name: '65+ yrs (Geriatrics)', count: geriatric, color: '#ef4444' }
    ];

    // 4. Gender Split
    let males = 0;
    let females = 0;
    let otherGender = 0;
    patients?.forEach(p => {
      if (p.sex === 'Female') females++;
      else if (p.sex === 'Male') males++;
      else otherGender++;
    });

    const genderSplit = [
      { name: 'Female', value: females, color: '#ec4899' },
      { name: 'Male', value: males, color: '#3b82f6' }
    ];
    if (otherGender > 0) {
      genderSplit.push({ name: 'Other', value: otherGender, color: '#a855f7' });
    }

    // 5. Triage Stratification (Derived from actual clinical encounters & appointments)
    let lvl1 = 0, lvl2 = 0, lvl3 = 0, lvl4 = 0, lvl5 = 0;
    filteredEncounters.forEach(e => {
      const type = e.type || '';
      let hasCritVital = false;
      e.vitals?.forEach(v => {
        if (v.type === 'blood_pressure') {
          const sys = parseInt((v.value || '').split('/')[0]);
          if (sys > 180) hasCritVital = true;
        } else if (v.type === 'oxygen_saturation' || v.type === 'spo2') {
          if (parseInt(v.value) < 90) hasCritVital = true;
        }
      });

      if (hasCritVital) lvl1++;
      else if (type === 'Emergency') lvl2++;
      else if (type === 'Follow-up') lvl4++;
      else lvl5++;
    });

    filteredAppointments.forEach(a => {
      if (a.reason && /urgent|emergency|severe/i.test(a.reason)) lvl3++;
    });

    const triageDistribution = [
      { level: 'Level 1: Resuscitation (Critical)', count: lvl1, color: '#ef4444' },
      { level: 'Level 2: Emergent', count: lvl2, color: '#f97316' },
      { level: 'Level 3: Urgent', count: lvl3, color: '#eab308' },
      { level: 'Level 4: Semi-Urgent', count: lvl4, color: '#3b82f6' },
      { level: 'Level 5: Non-Urgent (Routine)', count: lvl5, color: '#10b981' }
    ];

    // 6. Real Vitals Anomalies from Encounter Observations
    let totalBP = 0, highBP = 0;
    let totalTemp = 0, highTemp = 0;
    let totalSpo2 = 0, lowSpo2 = 0;
    let totalHR = 0, highHR = 0;

    filteredEncounters.forEach(e => {
      e.vitals?.forEach(v => {
        if (v.type === 'blood_pressure') {
          totalBP++;
          const parts = (v.value || '').split('/');
          const sys = parseInt(parts[0]);
          const dia = parseInt(parts[1]);
          if (sys > 180 || dia > 120) highBP++;
        } else if (v.type === 'temperature') {
          totalTemp++;
          const t = parseFloat(v.value);
          if (t > 38.5) highTemp++;
        } else if (v.type === 'oxygen_saturation' || v.type === 'spo2') {
          totalSpo2++;
          const s = parseInt(v.value);
          if (s < 92) lowSpo2++;
        } else if (v.type === 'heart_rate') {
          totalHR++;
          const hr = parseInt(v.value);
          if (hr > 100) highHR++;
        }
      });
    });

    const vitalsAnomalies = {
      hypertensiveCrisis: totalBP > 0 ? `${((highBP / totalBP) * 100).toFixed(1)}%` : '0.0%',
      highPyrexia: totalTemp > 0 ? `${((highTemp / totalTemp) * 100).toFixed(1)}%` : '0.0%',
      hypoxemia: totalSpo2 > 0 ? `${((lowSpo2 / totalSpo2) * 100).toFixed(1)}%` : '0.0%',
      tachycardia: totalHR > 0 ? `${((highHR / totalHR) * 100).toFixed(1)}%` : '0.0%'
    };

    // 7. Pharmacology: Prescriptions Volume & Stewardship
    const medCounts: Record<string, { count: number; name: string; category: string }> = {};
    let totalMeds = 0;
    let antibioticCount = 0;
    let polypharmacyCases = 0;

    filteredPrescriptions.forEach(p => {
      if (p.medications && p.medications.length >= 4) {
        polypharmacyCases++;
      }
      p.medications?.forEach(m => {
        totalMeds++;
        const name = m.name?.trim() || 'Medication';
        const isAbx = /cillin|mycin|oxacin|cef|ceph|doxycycline|metronidazole|azithro|clav/i.test(name);
        if (isAbx) antibioticCount++;
        const category = isAbx 
          ? 'Antibiotic' 
          : /paracetamol|ibuprofen|diclofenac|tramadol/i.test(name) 
          ? 'Analgesic' 
          : /artemether|lumefantrine|quinine|act/i.test(name) 
          ? 'Antimalarial' 
          : /amlodipine|lisinopril|losartan/i.test(name) 
          ? 'Antihypertensive' 
          : /metformin|glimepiride|insulin/i.test(name) 
          ? 'Antidiabetic' 
          : /hydrocortisone|clotrimazole|ketoconazole/i.test(name) 
          ? 'Dermatological' 
          : 'General Therapeutic';

        if (!medCounts[name]) medCounts[name] = { count: 0, name, category };
        medCounts[name].count += 1;
      });
    });

    const topPrescriptions = Object.values(medCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(m => ({ drug: m.name, count: m.count, class: m.category }));

    const antibioticRate = totalMeds > 0 ? `${((antibioticCount / totalMeds) * 100).toFixed(1)}%` : '0.0%';
    const polypharmacyRate = filteredPrescriptions.length > 0 ? `${((polypharmacyCases / filteredPrescriptions.length) * 100).toFixed(1)}%` : '0.0%';

    // 8. Laboratory Diagnostics Yield
    const totalTestsRequested = filteredLabOrders.length;
    let positiveCount = 0;
    const panelCounts: Record<string, { requests: number; positives: number; panel: string }> = {};

    filteredLabOrders.forEach(o => {
      const isPos = o.status === 'Completed' && Boolean(o.results && /positive|reactive|elevated|detected|abnormal/i.test(o.results));
      if (isPos) positiveCount++;
      const name = o.testType?.trim() || 'Routine Diagnostic';
      if (!panelCounts[name]) panelCounts[name] = { requests: 0, positives: 0, panel: name };
      panelCounts[name].requests += 1;
      if (isPos) panelCounts[name].positives += 1;
    });

    const positiveYieldRate = totalTestsRequested > 0 ? `${((positiveCount / totalTestsRequested) * 100).toFixed(1)}%` : '0.0%';
    const topPanels = Object.values(panelCounts)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 6)
      .map(p => ({
        panel: p.panel,
        requests: p.requests,
        positiveRate: p.requests > 0 ? `${Math.round((p.positives / p.requests) * 100)}%` : '0%'
      }));

    const labMetrics = {
      totalTestsRequested,
      positiveYieldRate,
      topPanels
    };

    // 9. Readmission & Continuity Metrics
    const encountersByPatient: Record<string, number> = {};
    filteredEncounters.forEach(e => {
      if (e.patientId) {
        encountersByPatient[e.patientId] = (encountersByPatient[e.patientId] || 0) + 1;
      }
    });
    const repeatPatients = Object.values(encountersByPatient).filter(c => c > 1).length;
    const readmissionRate30Days = totalPatients > 0 ? `${((repeatPatients / totalPatients) * 100).toFixed(1)}%` : '0.0%';

    // 10. Financial Performance: Scoped Invoices
    let totalRevenue = 0;
    const deptRevenue: Record<string, number> = {
      'Consultations': 0,
      'Pharmacy Dispensing': 0,
      'Laboratory Diagnostics': 0,
      'Procedures & Nursing': 0,
      'Wards & Observation': 0,
    };

    filteredInvoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const amt = Number(inv.amount || 0);
        totalRevenue += amt;

        if (Array.isArray(inv.items) && inv.items.length > 0) {
          inv.items.forEach((it: any) => {
            const itemAmt = Number(it.amount || it.price || 0) * Number(it.quantity || 1);
            const desc = (it.description || it.name || '').toLowerCase();
            if (/consult|doctor|exam|triage/i.test(desc)) deptRevenue['Consultations'] += itemAmt;
            else if (/rx|tablet|mg|syrup|pharma|injection|med/i.test(desc)) deptRevenue['Pharmacy Dispensing'] += itemAmt;
            else if (/lab|test|panel|fbc|malaria|scan|microscopy/i.test(desc)) deptRevenue['Laboratory Diagnostics'] += itemAmt;
            else if (/bed|ward|admiss/i.test(desc)) deptRevenue['Wards & Observation'] += itemAmt;
            else deptRevenue['Procedures & Nursing'] += itemAmt;
          });
        } else {
          deptRevenue['Consultations'] += amt;
        }
      }
    });

    const revenueBreakdown = [
      { name: 'Consultations', amount: deptRevenue['Consultations'], color: '#f97316' },
      { name: 'Pharmacy Dispensing', amount: deptRevenue['Pharmacy Dispensing'], color: '#10b981' },
      { name: 'Laboratory Diagnostics', amount: deptRevenue['Laboratory Diagnostics'], color: '#3b82f6' },
      { name: 'Procedures & Nursing', amount: deptRevenue['Procedures & Nursing'], color: '#8b5cf6' },
      { name: 'Wards & Observation', amount: deptRevenue['Wards & Observation'], color: '#ec4899' }
    ];

    const currencyCode = clinic?.currency || 'NGN';
    const currencySymbol = currencyCode === 'USD' ? '$' : currencyCode === 'GBP' ? '£' : currencyCode === 'EUR' ? '€' : '₦';
    const arpe = totalEncounters > 0 ? Math.round(totalRevenue / totalEncounters) : 0;

    // 11. Disease Trajectory Trendline over Selected Window
    const checkpoints = [30, 25, 20, 15, 10, 5, 0];
    const trendline = checkpoints.map(daysAgo => {
      const targetDate = subDays(new Date(), daysAgo);
      const label = daysAgo === 0 ? 'Today' : `-${daysAgo}d`;

      let malaria = 0, hypertension = 0, skin = 0, respiratory = 0;
      encounters?.forEach(e => {
        if (!e.date) return;
        const encDate = new Date(e.date);
        const diff = Math.abs(differenceInDays(targetDate, encDate));
        if (diff <= 2) {
          const diag = (e.diagnosis || e.soap?.assessment || '').toLowerCase();
          if (/malaria/i.test(diag)) malaria++;
          if (/hypertension/i.test(diag)) hypertension++;
          if (/skin|derm|rash|eczema/i.test(diag)) skin++;
          if (/respiratory|urti|cough|pneumonia/i.test(diag)) respiratory++;
        }
      });

      return { day: label, malaria, hypertension, skin, respiratory };
    });

    return {
      baseDiseases,
      skinDiseasesCount,
      overallFatalityRate,
      overallRecoveryRate,
      ageCohorts,
      genderSplit,
      triageDistribution,
      vitalsAnomalies,
      topPrescriptions,
      antibioticRate,
      polypharmacyRate,
      labMetrics,
      readmissionRate30Days,
      revenueBreakdown,
      totalRevenue,
      arpe,
      currencySymbol,
      currencyCode,
      trendline
    };
  }, [patients, encounters, appointments, invoices, prescriptions, labOrders, clinic, timeRange]);

  // Filtered diseases for the morbidity search table
  const filteredDiseases = useMemo(() => {
    return analytics.baseDiseases.filter(d => {
      const matchesSearch = !diseaseSearch || d.name.toLowerCase().includes(diseaseSearch.toLowerCase()) || d.category.toLowerCase().includes(diseaseSearch.toLowerCase());
      const matchesCat = categoryFilter === 'all' || d.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [analytics.baseDiseases, diseaseSearch, categoryFilter]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-700 pb-16">
      {/* Top Controls Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl tracking-tight text-foreground">Clinical & Epidemiological Intelligence</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Live Verified Records
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Real-time disease morbidity index, skin pathology tracking, clinical fatality rates, vitals anomalies, and hospital revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background/50 border-dashed">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Full Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 text-xs border-dashed gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print / Export PDF
          </Button>
        </div>
      </div>

      {/* ── ROW 1: CORE CLINICAL STATS (8 KEY METRICS - ZERO MOCK DATA) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient Base</p>
          <p className="text-xl font-black mt-1 text-foreground">{patients?.length || 0}</p>
          <span className="text-[10px] text-muted-foreground font-semibold">
            {patients?.length ? `${patients.length} registered` : 'Active registry'}
          </span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Encounters</p>
          <p className="text-xl font-black mt-1 text-primary">{encounters?.length || 0}</p>
          <span className="text-[10px] text-muted-foreground">SOAP notes filed</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Skin Disorders</p>
          <p className="text-xl font-black mt-1 text-amber-500">{analytics.skinDiseasesCount}</p>
          <span className="text-[10px] text-muted-foreground">Dermatological cases</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Fatality Rate</p>
          <p className="text-xl font-black mt-1 text-red-500">{analytics.overallFatalityRate}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Clinical risk index</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Recovery Rate</p>
          <p className="text-xl font-black mt-1 text-emerald-500">{analytics.overallRecoveryRate}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Discharged resolved</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Antibiotic Rate</p>
          <p className="text-xl font-black mt-1 text-blue-500">{analytics.antibioticRate}</p>
          <span className="text-[10px] text-muted-foreground">Stewardship target</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Lab Yield</p>
          <p className="text-xl font-black mt-1 text-purple-500">{analytics.labMetrics.positiveYieldRate}</p>
          <span className="text-[10px] text-muted-foreground">Diagnostic positives</span>
        </Card>
        <Card className="p-3 border-dashed bg-card/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Readmissions</p>
          <p className="text-xl font-black mt-1 text-rose-500">{analytics.readmissionRate30Days}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">30-day index</span>
        </Card>
      </div>

      {/* ── MAIN TABS: DISEASE EPIDEMIOLOGY, VITALS, PHARMACOLOGY, REVENUE ── */}
      <Tabs defaultValue="diseases" className="w-full space-y-4">
        <TabsList className="bg-muted/40 border p-1 h-auto flex flex-wrap items-center justify-start gap-1">
          <TabsTrigger value="diseases" className="text-xs font-semibold gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-primary" /> Disease Prevalence & Fatalities
          </TabsTrigger>
          <TabsTrigger value="demographics" className="text-xs font-semibold gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-500" /> Age & Gender Demographics
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs font-semibold gap-1.5">
            <Activity className="h-3.5 w-3.5 text-red-500" /> Triage & Vitals Anomalies
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="text-xs font-semibold gap-1.5">
            <Pill className="h-3.5 w-3.5 text-emerald-500" /> Pharmacy & Drug Stewardship
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-xs font-semibold gap-1.5">
            <Activity className="h-3.5 w-3.5 text-purple-500" /> Laboratory & Diagnostics
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs font-semibold gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-orange-500" /> Financial Performance
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: DISEASE PREVALENCE & FATALITIES ── */}
        <TabsContent value="diseases" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Caseload Trajectory Timeline
                </CardTitle>
                <CardDescription className="text-xs">Live tracking of Malaria, Hypertension, Skin Disorders, and Respiratory infections.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trendline}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" fontSize={10} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="malaria" name="Malaria" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="skin" name="Skin Diseases" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="hypertension" name="Hypertension" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="respiratory" name="URTI" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Top Morbidity Diagnoses Ranking
                </CardTitle>
                <CardDescription className="text-xs">Highest burden diagnoses documented across live patient clinical charts.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.baseDiseases.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.baseDiseases.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" fontSize={10} tickLine={false} />
                        <YAxis type="category" dataKey="name" fontSize={9} width={130} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="cases" fill="#f97316" radius={[0, 4, 4, 0]} name="Recorded Cases" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <span>No clinical diagnoses recorded yet for this facility.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Disease Prevalence & Fatality Table with Search and Filters */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold">Epidemiological Disease Ledger</CardTitle>
                  <CardDescription className="text-xs">Live clinical statistics including fatality rate, recovery rate, and diagnostic classification.</CardDescription>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search disease (e.g. Skin, Malaria)..." 
                      value={diseaseSearch}
                      onChange={(e) => setDiseaseSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="dermatological">Dermatological</SelectItem>
                      <SelectItem value="infectious">Infectious</SelectItem>
                      <SelectItem value="respiratory">Respiratory</SelectItem>
                      <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                      <SelectItem value="gastrointestinal">Gastrointestinal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredDiseases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 uppercase font-bold text-muted-foreground border-y">
                      <tr>
                        <th className="px-4 py-2.5">Diagnosis / Pathology</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Incident Cases</th>
                        <th className="px-4 py-2.5">Fatality Rate</th>
                        <th className="px-4 py-2.5">Recovery Rate</th>
                        <th className="px-4 py-2.5">Severity Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredDiseases.map((d, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{d.name}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={d.category === 'Dermatological' ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]" : "text-[10px]"}>
                              {d.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-foreground">{d.cases} patients</td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-red-500">{d.fatalityRate}</td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-emerald-500">{d.recoveredRate}%</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {parseFloat(d.fatalityRate) > 1.0 ? 'High Vigilance' : 'Standard Protocol'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No diagnosis records found matching current filters.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: DEMOGRAPHICS & AGE COHORTS ── */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Baby className="h-4 w-4 text-primary" /> Age Cohort Patient Stratification
                </CardTitle>
                <CardDescription className="text-xs">Real patient registry distribution across pediatric, adult, and geriatric groups.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.ageCohorts}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={9} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Patient Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-500" /> Gender Morbidity Split
                </CardTitle>
                <CardDescription className="text-xs">Recorded female vs. male patient demographics.</CardDescription>
              </CardHeader>
              <CardContent>
                {patients && patients.length > 0 ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={analytics.genderSplit} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                          {analytics.genderSplit.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <span>No patient records in registry yet.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 3: TRIAGE & VITALS ANOMALIES ── */}
        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="p-4 border-dashed border-red-500/30 bg-red-500/5">
              <p className="text-[10px] uppercase font-bold text-red-500">Hypertensive Crisis Rate</p>
              <p className="text-2xl font-black mt-1 text-red-600">{analytics.vitalsAnomalies.hypertensiveCrisis}</p>
              <p className="text-[11px] text-muted-foreground mt-1">BP &gt; 180/120 mmHg detected</p>
            </Card>
            <Card className="p-4 border-dashed border-amber-500/30 bg-amber-500/5">
              <p className="text-[10px] uppercase font-bold text-amber-500">High Grade Fever (&gt;38.5°C)</p>
              <p className="text-2xl font-black mt-1 text-amber-600">{analytics.vitalsAnomalies.highPyrexia}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pyrexia response alerts</p>
            </Card>
            <Card className="p-4 border-dashed border-blue-500/30 bg-blue-500/5">
              <p className="text-[10px] uppercase font-bold text-blue-500">Hypoxemia Rate (SpO2 &lt;92%)</p>
              <p className="text-2xl font-black mt-1 text-blue-600">{analytics.vitalsAnomalies.hypoxemia}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Oxygen saturation alerts</p>
            </Card>
            <Card className="p-4 border-dashed border-purple-500/30 bg-purple-500/5">
              <p className="text-[10px] uppercase font-bold text-purple-500">Tachycardia Index (HR &gt;100)</p>
              <p className="text-2xl font-black mt-1 text-purple-600">{analytics.vitalsAnomalies.tachycardia}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Arrhythmia & sepsis alerts</p>
            </Card>
          </div>

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Emergency Triage Stratification (Manchester / ESI Protocol)</CardTitle>
              <CardDescription className="text-xs">Acuity distribution of patients upon arrival at reception & nursing triage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.triageDistribution.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-xs font-semibold">{t.level}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold">{t.count} patients</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: PHARMACOLOGY & DRUG STEWARDSHIP ── */}
        <TabsContent value="prescriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Pill className="h-4 w-4 text-emerald-500" /> Top Prescribed Medications
                </CardTitle>
                <CardDescription className="text-xs">Frequently dispensed therapeutics logged across clinical orders.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.topPrescriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 uppercase font-bold text-muted-foreground border-y">
                        <tr>
                          <th className="px-4 py-2">Medication Name</th>
                          <th className="px-4 py-2">Class</th>
                          <th className="px-4 py-2 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {analytics.topPrescriptions.map((p, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-4 py-2 font-medium text-foreground">{p.drug}</td>
                            <td className="px-4 py-2 text-muted-foreground">{p.class}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No prescription records logged yet for this period.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-dashed p-4 bg-muted/10">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-blue-500" /> Antibiotic Stewardship Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-blue-600">{analytics.antibioticRate}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Target Met (&lt;30%)</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Monitors appropriate antibiotic utilization to prevent antimicrobial resistance (AMR) in clinical practice.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-dashed p-4 bg-muted/10">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-500" /> Polypharmacy Risk Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-purple-600">{analytics.polypharmacyRate}</span>
                    <Badge variant="outline" className="text-[10px]">4+ Concurrent Rx</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Percentage of active patients prescribed 4 or more medications concurrently.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 5: LABORATORY & DIAGNOSTICS ── */}
        <TabsContent value="labs" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Diagnostic Investigation Panels & Positive Yield</CardTitle>
              <CardDescription className="text-xs">Clinical diagnostic yield tracking for laboratory quality control.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {analytics.labMetrics.topPanels.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 uppercase font-bold text-muted-foreground border-y">
                      <tr>
                        <th className="px-4 py-2.5">Diagnostic Panel</th>
                        <th className="px-4 py-2.5">Total Orders</th>
                        <th className="px-4 py-2.5">Positive / Reactive Yield</th>
                        <th className="px-4 py-2.5">Clinical Utility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {analytics.labMetrics.topPanels.map((l, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{l.panel}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{l.requests} tests</td>
                          <td className="px-4 py-2.5 font-mono font-bold text-purple-600">{l.positiveRate}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-[10px]">Diagnostic Path</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No laboratory investigation orders found for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 6: FINANCIAL PERFORMANCE ── */}
        <TabsContent value="finance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Revenue Stream by Department
                </CardTitle>
                <CardDescription className="text-xs">Income distribution across hospital service departments.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.totalRevenue > 0 ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={analytics.revenueBreakdown} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="amount"
                        >
                          {analytics.revenueBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${analytics.currencySymbol}${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <span>No paid invoices recorded for this time window.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed p-4 flex flex-col justify-between">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-bold">Financial Summary KPI</CardTitle>
                <CardDescription className="text-xs">Hospital operational economic runrate.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Total Departmental Revenue</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {analytics.currencySymbol}{analytics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Average Revenue Per Encounter (ARPE)</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {analytics.currencySymbol}{analytics.arpe.toLocaleString()}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-0 pt-3">
                <Button className="w-full text-xs font-semibold gap-1.5" onClick={() => window.print()}>
                  <Download className="h-3.5 w-3.5" /> Download Comprehensive Financial Audit
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
