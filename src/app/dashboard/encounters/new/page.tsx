'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, addDoc, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
    Activity,
    Stethoscope,
    Pill,
    ClipboardList,
    Save,
    Search,
    User,
    Thermometer,
    Heart,
    Scale,
    Droplets,
    CheckCircle2,
    Clock,
    BadgeDollarSign,
    Sparkles,
    Mic,
    FileAudio,
    BrainCircuit,
    Wand2,
    Loader2,
    Download
} from 'lucide-react';
import type { Patient, UserProfile, Encounter, Observation } from '@/lib/types';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalLetterhead } from '@/components/medical/letterhead';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Clinic } from '@/lib/types';

export default function NewEncounterPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const patientId = searchParams.get('patientId');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const patientRef = useMemo(() => {
        if (!firestore || !patientId) return null;
        return doc(firestore, 'patients', patientId);
    }, [firestore, patientId]);
    const { data: patient, loading: patientLoading } = useDoc<Patient>(patientRef);

    // Vitals State
    const [vitals, setVitals] = useState({
        temp: '',
        bp_sys: '',
        bp_dia: '',
        hr: '',
        rr: '',
        weight: '',
        height: '',
        spo2: ''
    });

    // SOAP Note State
    const [soap, setSoap] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
    });

    // Prescriptions State (simple list for now)
    const [prescriptionInput, setPrescriptionInput] = useState('');
    const [prescriptions, setPrescriptions] = useState<string[]>([]);

    const addPrescription = () => {
        if (prescriptionInput.trim()) {
            setPrescriptions([...prescriptions, prescriptionInput.trim()]);
            setPrescriptionInput('');
        }
    };

    const removePrescription = (idx: number) => {
        setPrescriptions(prescriptions.filter((_, i) => i !== idx));
    };

    const clinicRef = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', userProfile.clinicId);
    }, [userProfile, firestore]);
    const { data: clinic } = useDoc<Clinic>(clinicRef);

    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('printable-encounter');
        if (!element || !patient) return;

        setIsDownloading(true);
        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save(`SOAP_Note_${patient.surname}_${format(new Date(), 'yyyyMMdd')}.pdf`);

            toast({ title: 'Document Exported', description: 'Clinical SOAP note has been generated successfully.' });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({ title: 'Export Failed', description: 'Error creating clinical document.', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!firestore || !userProfile || !patient) return;

        setIsSaving(true);
        try {
            const vitalsList: Observation[] = [
                { id: 't1', type: 'temperature' as const, value: vitals.temp, unit: '°C', timestamp: new Date().toISOString() },
                { id: 'b1', type: 'blood_pressure' as const, value: `${vitals.bp_sys}/${vitals.bp_dia}`, unit: 'mmHg', timestamp: new Date().toISOString() },
                { id: 'h1', type: 'heart_rate' as const, value: vitals.hr, unit: 'bpm', timestamp: new Date().toISOString() },
                { id: 'w1', type: 'weight' as const, value: vitals.weight, unit: 'kg', timestamp: new Date().toISOString() },
            ].filter(v => v.value) as Observation[];

            const encounterData: Omit<Encounter, 'id'> = {
                clinicId: userProfile.clinicId!,
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.surname}`,
                doctorId: userProfile.uid,
                doctorName: userProfile.name,
                date: new Date().toISOString(),
                type: 'Consultation',
                soap: soap,
                vitals: vitalsList,
                status: status,
                prescriptions: prescriptions,
            };

            await addDoc(collection(firestore, 'encounters'), encounterData);

            // Log Audit
            await addDoc(collection(firestore, 'audit_logs'), {
                clinicId: userProfile.clinicId,
                action: status === 'Finalized' ? 'FINALIZED_ENCOUNTER' : 'SAVED_ENCOUNTER_DRAFT',
                timestamp: new Date().toISOString(),
                details: `Clinical encounter ${status.toLowerCase()} for ${patient.firstName} ${patient.surname} by Dr. ${userProfile.name}`
            });

            toast({
                title: status === 'Finalized' ? 'Encounter Finalized' : 'Draft Saved',
                description: `Successfully ${status === 'Finalized' ? 'completed' : 'saved'} consultation for ${patient.firstName}.`,
            });

            router.push(`/dashboard/patients/${patient.id}`);
        } catch (error: any) {
            console.error("Error saving encounter:", error);
            toast({
                title: 'Error',
                description: 'Failed to save encounter: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (patientLoading) return <LoadingAnimation />;

    if (userProfile && userProfile.role === 'receptionist') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-orange-500/5 max-w-2xl mx-auto mt-10 p-8">
                <Stethoscope className="h-12 w-12 text-orange-500/50 mb-4" />
                <h3 className="text-xl font-bold">Access Denied</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    Receptionists are not authorized to create or manage clinical SOAP consultations. Please contact your administrator if you believe this is an error.
                </p>
                <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
            </div>
        );
    }

    if (!patientId || !patient) {
        return (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4 md:p-8">
                <Card className="border border-dashed bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-orange-500" />
                            Start New Consultation
                        </CardTitle>
                        <CardDescription>Search for a patient or select from recent arrivals to begin a SOAP note.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or patient code..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button className="w-full button-glow" onClick={() => router.push('/dashboard/patients')}>
                            Go to Patients Directory
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto py-6">

            {/* Patient Info Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-dashed bg-card shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                            {getInitials(`${patient.firstName} ${patient.surname}`)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{patient.firstName} {patient.surname}</h1>
                        <div className="flex gap-3 text-[11px] text-muted-foreground mt-1 font-mono uppercase">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-zinc-400">ID: {patient.patientCode}</span>
                            <span>•</span>
                            <span>{patient.sex}</span>
                            <span>•</span>
                            <span>{new Date().getFullYear() - new Date(patient.dob).getFullYear()} Years</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <BadgeDollarSign className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold">Consultation Mode</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Digital Health Signature Enabled</p>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                {/* --- VITALS SECTION (Paper Segment) --- */}
                <section className="bg-white dark:bg-zinc-900 border border-dashed border-border shadow-sm p-8 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                        <Activity className="w-16 h-16" />
                    </div>
                    <div className="flex items-center gap-2 mb-6 border-b border-dashed pb-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Patient Vitals Baseline</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5"><Thermometer className="h-3 w-3" /> Temp (°C)</Label>
                            <Input type="number" step="0.1" className="bg-transparent border-0 border-b border-dashed rounded-none h-9 px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold text-lg" value={vitals.temp} onChange={e => setVitals({ ...vitals, temp: e.target.value })} placeholder="36.5" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5"><Heart className="h-3 w-3" /> BP (Systolic/Diastolic)</Label>
                            <div className="flex items-end gap-2">
                                <Input type="number" className="bg-transparent border-0 border-b border-dashed rounded-none h-9 px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold text-lg min-w-[60px]" value={vitals.bp_sys} onChange={e => setVitals({ ...vitals, bp_sys: e.target.value })} placeholder="120" />
                                <span className="text-xl opacity-30">/</span>
                                <Input type="number" className="bg-transparent border-0 border-b border-dashed rounded-none h-9 px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold text-lg min-w-[60px]" value={vitals.bp_dia} onChange={e => setVitals({ ...vitals, bp_dia: e.target.value })} placeholder="80" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5"><Activity className="h-3 w-3" /> Pulse (bpm)</Label>
                            <Input type="number" className="bg-transparent border-0 border-b border-dashed rounded-none h-9 px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold text-lg" value={vitals.hr} onChange={e => setVitals({ ...vitals, hr: e.target.value })} placeholder="72" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5"><Droplets className="h-3 w-3" /> SpO2 (%)</Label>
                            <Input type="number" className="bg-transparent border-0 border-b border-dashed rounded-none h-9 px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold text-lg" value={vitals.spo2} onChange={e => setVitals({ ...vitals, spo2: e.target.value })} placeholder="98" />
                        </div>
                    </div>
                </section>

                {/* --- SOAP DATA (The "Paper" Content) --- */}
                <section className="bg-white dark:bg-zinc-900 border border-dashed border-border shadow-sm p-8 space-y-10 min-h-[800px] relative">
                    <div className="absolute inset-0 bg-grid-slate-100/[0.03] pointer-events-none" />

                    {/* (S) Subjective */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3 border-b border-dashed border-primary/20 pb-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <span className="bg-primary text-white w-5 h-5 flex items-center justify-center rounded-sm text-[10px]">S</span>
                                Subjective History
                            </h4>
                            <span className="text-[9px] text-muted-foreground italic ml-auto">Patient symptoms & chief complaints</span>
                        </div>
                        <Textarea
                            className="w-full min-h-[120px] bg-transparent border-0 focus-visible:ring-0 p-0 text-sm leading-relaxed font-serif italic selection:bg-primary/20"
                            placeholder="Patient reports progressive symptoms including..."
                            value={soap.subjective}
                            onChange={e => setSoap({ ...soap, subjective: e.target.value })}
                        />
                    </div>

                    {/* (O) Objective */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3 border-b border-dashed border-blue-500/20 pb-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                                <span className="bg-blue-500 text-white w-5 h-5 flex items-center justify-center rounded-sm text-[10px]">O</span>
                                Objective Findings
                            </h4>
                            <span className="text-[9px] text-muted-foreground italic ml-auto">Clinical physical examination & results</span>
                        </div>
                        <Textarea
                            className="w-full min-h-[120px] bg-transparent border-0 focus-visible:ring-0 p-0 text-sm leading-relaxed selection:bg-blue-500/20"
                            placeholder="Physical exam reveals significant findings in..."
                            value={soap.objective}
                            onChange={e => setSoap({ ...soap, objective: e.target.value })}
                        />
                    </div>

                    {/* (A) Assessment */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3 border-b border-dashed border-emerald-500/20 pb-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                <span className="bg-emerald-500 text-white w-5 h-5 flex items-center justify-center rounded-sm text-[10px]">A</span>
                                clinical Assessment
                            </h4>
                            <span className="text-[9px] text-muted-foreground italic ml-auto">Diagnostic impressions (e.g. ICD-10)</span>
                        </div>
                        <Textarea
                            className="w-full min-h-[100px] bg-emerald-500/5 dark:bg-emerald-500/10 border-0 focus-visible:ring-0 p-4 text-sm font-bold leading-relaxed selection:bg-emerald-500/20"
                            placeholder="1. Primary diagnosis...
2. Secondary findings..."
                            value={soap.assessment}
                            onChange={e => setSoap({ ...soap, assessment: e.target.value })}
                        />
                    </div>

                    {/* (P) Plan */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3 border-b border-dashed border-purple-500/20 pb-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                <span className="bg-purple-500 text-white w-5 h-5 flex items-center justify-center rounded-sm text-[10px]">P</span>
                                Management Plan
                            </h4>
                            <span className="text-[9px] text-muted-foreground italic ml-auto">Treatment, meds, and follow-up</span>
                        </div>
                        <Textarea
                            className="w-full min-h-[150px] bg-transparent border-0 focus-visible:ring-0 p-0 text-sm leading-relaxed border-l-4 border-purple-500/20 pl-4 py-2 selection:bg-purple-500/20"
                            placeholder="Initiation of treatment protocol including..."
                            value={soap.plan}
                            onChange={e => setSoap({ ...soap, plan: e.target.value })}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-2 text-primary opacity-40 hover:opacity-100 cursor-pointer transition-opacity" title="AI Assistant Suggestions">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">AI Suggest</span>
                        </div>
                    </div>

                    {/* Prescription Section Integrated into Paper */}
                    <div className="mt-12 bg-primary/5 p-6 border-2 border-dashed border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Pill className="h-3 w-3 text-primary" /> Authorized Prescriptions (Rₓ)
                            </h4>
                            <Badge variant="outline" className="text-[8px] bg-white dark:bg-black">Digital Signature Active</Badge>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <Input
                                className="h-10 bg-background border-dashed text-sm"
                                placeholder="Add medication (dosage, freq)..."
                                value={prescriptionInput}
                                onChange={e => setPrescriptionInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addPrescription()}
                            />
                            <Button size="sm" onClick={addPrescription}>Add Script</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {prescriptions.map((p, i) => (
                                <div key={i} className="bg-background border border-dashed p-2 px-3 rounded flex items-center justify-between group">
                                    <span className="text-xs font-bold font-mono uppercase truncate pr-4">{p}</span>
                                    <button onClick={() => removePrescription(i)} className="text-destructive opacity-40 group-hover:opacity-100 transition-opacity">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- SUBMISSION & ATTESTATION SECTION --- */}
                <section className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/50 p-8 text-center space-y-6">
                    <div className="max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-black tracking-tighter">Attestation & Record Locking</h3>
                        <p className="text-xs text-muted-foreground mt-2">
                            I, Dr. <span className="font-bold text-foreground">{userProfile?.name}</span>, attest that the above clinical findings and management plan are accurate observations made during this encounter on {format(new Date(), 'PPP')}.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto pt-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 border-dashed font-bold uppercase tracking-widest text-xs"
                            onClick={() => handleSave('Draft')}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4 mr-2" />} Save as Draft
                        </Button>
                        <Button
                            className="flex-1 h-12 button-glow font-bold uppercase tracking-widest text-xs"
                            onClick={() => handleSave('Finalized')}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-2" />} Sign & Finalize Record
                        </Button>
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="link"
                            className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest h-auto p-0 hover:text-primary transition-colors"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                        >
                            <Download className="h-3 w-3 mr-2" /> Preview & Export Institution Record (PDF)
                        </Button>
                    </div>
                </section>
            </div>

            {/* HIDDEN PRINTABLE ENCOUNTER */}
            <div className="hidden">
                <div id="printable-encounter" className="bg-white p-[20mm] w-[210mm] min-h-[297mm] text-black border shadow-xl">
                    <MedicalLetterhead clinicName={clinic?.name} clinicAddress={clinic?.address} clinicPhone={clinic?.phone} clinicEmail={clinic?.email} />

                    <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-8">
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tight">Clinical SOAP Note</h2>
                            <p className="font-mono text-sm opacity-60">ELECTRONIC HEALTH RECORD • {format(new Date(), 'PPP')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-gray-400">Record ID</p>
                            <p className="font-mono text-xs">ENCOUNTER-TEMP-{new Date().getTime().toString().slice(-6)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-6 rounded-lg border border-gray-100">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Patient Demographics</p>
                            <p className="text-xl font-bold">{patient.firstName} {patient.surname}</p>
                            <p className="text-xs font-medium text-gray-600">Gender: {patient.sex} • DOB: {patient.dob ? format(new Date(patient.dob), 'PP') : 'N/A'}</p>
                            <p className="text-xs font-medium text-gray-600">ID: {patient.patientCode}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Attending Clinician</p>
                            <p className="text-lg font-bold italic">Dr. {userProfile?.name}</p>
                            <p className="text-xs font-medium text-gray-600">{userProfile?.role.toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">Vitals & Objective Baseline</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {Object.entries(vitals).map(([key, value]) => value && (
                                    <div key={key} className="bg-white border border-gray-100 p-3 rounded shadow-sm">
                                        <p className="text-[8px] font-black uppercase text-gray-400">{key.replace('_', ' ')}</p>
                                        <p className="text-sm font-bold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-8">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3 text-gray-400">(S) Subjective History</h3>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-gray-100">{soap.subjective || 'No subjective historical data provided.'}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3 text-gray-400">(O) Objective Physical Findings</h3>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-gray-100">{soap.objective || 'No objective physical findings noted.'}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3 text-black">(A) Clinical Assessment & Diagnosis</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <p className="text-sm font-bold whitespace-pre-wrap">{soap.assessment || 'Diagnostic evaluation pending.'}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3 text-black">(P) Management Plan & Treatment</h3>
                                <p className="text-sm border-l-4 border-black pl-4 py-2 italic whitespace-pre-wrap">{soap.plan || 'Standard follow-up protocol.'}</p>
                            </div>
                        </section>

                        {prescriptions.length > 0 && (
                            <section>
                                <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">Authorized Prescriptions</h3>
                                <div className="space-y-2">
                                    {prescriptions.map((p, i) => (
                                        <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                            <p className="text-sm font-bold">{p}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="mt-auto pt-20">
                        <div className="flex justify-between items-end border-t border-gray-200 pt-4">
                            <div className="text-[9px] uppercase font-mono text-gray-400">
                                Digital ID: {userProfile?.uid.slice(0, 8)}-{new Date().getTime()}
                                <br />
                                Locked by Orelis Medical Intelligence
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase">Clinician Signature</p>
                                <p className="text-xl font-serif italic text-gray-600">/signed/ Dr. {userProfile?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
