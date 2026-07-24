
'use client';
import { useMemo, useState } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Patient, UserProfile, Clinic, Encounter } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, FileText, User as UserIcon, Download, Printer, Copy, BriefcaseMedical, Calendar as CalendarIcon, Heart, Phone, Mail, MapPin, Users, Loader2, Stethoscope, Shield, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import Link from 'next/link';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import { MedicalLetterhead } from '@/components/medical/letterhead';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwinVisualizer } from '@/components/dashboard/TwinVisualizer';
import { WhatIfCoach } from '@/components/dashboard/WhatIfCoach';



interface RecordSheetProps {
    patient: Patient;
    clinic: Clinic | null | undefined;
    encounters: Encounter[] | null | undefined;
    isPdfMode?: boolean;
}

function PatientHealthRecordSheet({ patient, clinic, encounters, isPdfMode = false }: RecordSheetProps) {
    const formattedDob = patient.dob ? format(new Date(patient.dob), 'd MMMM yyyy') : 'N/A';
    const formattedIssuedDate = patient.registrationDate ? format(new Date(patient.registrationDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

    const allergiesList = patient.allergies || [
        { name: 'Bee Stings', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Dogs/pets', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Peanuts', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Penicillin', severity: 'Moderate to severe', reaction: 'Shortness of breath' },
        { name: 'Codeine', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Latex', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Shellfish', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Soy', severity: 'Moderate', reaction: 'Hives' }
    ];

    const immunizationsList = patient.immunizations || [
        { name: 'Influenza Virus Vaccine', due: 'Dec 2026', type: 'Intramuscular injection', value: '50 / mcg', instructions: 'Possible flu-like symptoms for 3 days' },
        { name: 'Tetanus and Diphtheria Toxoids', due: 'Jan 2027', type: 'Intramuscular injection', value: '50 / mcg', instructions: 'Mild pain or soreness in the local area' }
    ];

    const planOfCareList = patient.planOfCare || [
        { name: 'Office consultation', date: '1 DEC 2026', instructions: 'General follow-up evaluation' },
        { name: 'Chest X-ray', date: '15 DEC 2026', instructions: 'Standard screening' },
        { name: 'Sputum Culture', date: '8 JAN 2027', instructions: 'Lab work check' }
    ];

    return (
        <div className={cn(
            "bg-white text-black font-sans w-full max-w-[800px] mx-auto border-2 border-black p-8 sm:p-12 shadow-2xl relative select-none",
            isPdfMode ? "w-[210mm] min-h-[297mm] p-[20mm]" : ""
        )}>
            {/* Top Header */}
            <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-black font-headline uppercase">MEDICAL HEALTH RECORD</h1>
                    <p className="text-[10px] text-gray-500 font-mono tracking-wider">ORELIS MEDICAL SYSTEM</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">ISSUED DATE</p>
                    <p className="text-sm font-bold text-black mt-1">{formattedIssuedDate}</p>
                </div>
            </div>

            {/* Main Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-black">
                {/* Left Profile Column */}
                <div className="md:col-span-4 border-r border-gray-200 pr-6 space-y-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">YOUR PROFILE</p>
                        <h2 className="text-3xl font-black text-black leading-tight mb-4">{patient.surname} {patient.firstName}</h2>
                        
                        {/* Profile Photo Frame */}
                        <div className="w-32 h-36 border border-gray-300 bg-gray-50 flex items-center justify-center mb-6 overflow-hidden relative group">
                            <UserIcon className="w-16 h-16 text-gray-300" />
                            {patient.photoUrl && (
                                <img src={patient.photoUrl} alt="Patient Portrait" className="w-full h-full object-cover absolute inset-0" />
                            )}
                        </div>
                    </div>

                    {/* Profile Fields */}
                    <div className="space-y-4 text-xs">
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">DATE OF BIRTH</p>
                            <p className="text-sm font-bold text-gray-800">{formattedDob}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">GENDER</p>
                            <p className="text-sm font-bold text-gray-800">{patient.sex}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">MARITAL STATUS</p>
                            <p className="text-sm font-bold text-gray-800">{patient.maritalStatus}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">PHONE</p>
                            <p className="text-sm font-bold text-gray-800">{patient.phone}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">ADDRESS</p>
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{patient.address}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">ETHNICITY</p>
                            <p className="text-sm font-bold text-gray-800">{patient.origin || 'African'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">LANGUAGE SPOKEN</p>
                            <p className="text-sm font-bold text-gray-800">{patient.tribe || 'English'}</p>
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Guardian / Next of Kin */}
                    <div className="space-y-4 text-xs">
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">GUARDIAN</p>
                        <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">{patient.nextOfKin?.relation?.toUpperCase() || 'NEXT OF KIN'}</p>
                            <p className="text-sm font-bold text-gray-800">{patient.nextOfKin?.name || 'N/A'}</p>
                        </div>
                        {patient.nextOfKin?.phone && (
                            <div>
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">PHONE</p>
                                <p className="text-sm font-bold text-gray-800">{patient.nextOfKin.phone}</p>
                            </div>
                        )}
                        {patient.nextOfKin?.address && (
                            <div>
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">ADDRESS</p>
                                <p className="text-sm text-gray-800 leading-relaxed">{patient.nextOfKin.address}</p>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* Provider */}
                    <div className="space-y-4 text-xs">
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">PROVIDER</p>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{clinic?.name || 'Ashby Medical Center'}</p>
                        </div>
                        {clinic?.phone && (
                            <div>
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">PHONE</p>
                                <p className="text-sm font-bold text-gray-800">{clinic.phone}</p>
                            </div>
                        )}
                        {clinic?.address && (
                            <div>
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">ADDRESS</p>
                                <p className="text-sm text-gray-800 leading-relaxed">{clinic.address}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Notes & Medical Tables Column */}
                <div className="md:col-span-8 pl-0 md:pl-4 space-y-8">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-4">IMPORTANT NOTES</p>
                        
                        {/* Allergies Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold text-black text-sm select-none">✓</div>
                                <div>
                                    <h3 className="text-lg font-bold text-black leading-none">Allergies</h3>
                                    <p className="text-[11px] text-gray-500 italic mt-0.5">You have {allergiesList.length} known allergies.</p>
                                </div>
                            </div>
                            
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-300 text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                                        <th className="pb-2 font-bold">NAME</th>
                                        <th className="pb-2 font-bold">SEVERITY</th>
                                        <th className="pb-2 font-bold">REACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allergiesList.map((allergy: any, idx: number) => (
                                        <tr key={idx} className="text-gray-800">
                                            <td className="py-2.5 font-semibold">{allergy.name}</td>
                                            <td className="py-2.5">{allergy.severity}</td>
                                            <td className="py-2.5">{allergy.reaction}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Immunizations Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-black flex items-center justify-center text-white text-xs">
                                <Pill className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-black leading-none">Immunizations</h3>
                                <p className="text-[11px] text-gray-500 italic mt-0.5">You have {immunizationsList.length} upcoming immunizations.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {immunizationsList.map((imm: any, idx: number) => (
                                <div key={idx} className="border border-dashed border-gray-300 p-4 rounded bg-gray-50/50 relative">
                                    <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider font-bold text-gray-400 bg-white/80 px-1 py-0.5 rounded">Due by {imm.due}</span>
                                    
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">NAME</p>
                                    <p className="text-xs font-bold text-black leading-tight mb-2.5 pr-14">{imm.name}</p>
                                    
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">TYPE AND DOSE</p>
                                    <p className="text-xs text-gray-800 mb-2.5">{imm.type}</p>
                                    
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">VALUE / UNIT</p>
                                    <p className="text-xs text-gray-800 mb-2.5">{imm.value}</p>
                                    
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">EDUCATION / INSTRUCTIONS</p>
                                    <p className="text-xs text-gray-600 leading-snug">{imm.instructions}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Plan of Care Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-100 border border-black flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-black" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-black leading-none">Plan of Care</h3>
                                <p className="text-[11px] text-gray-500 italic mt-0.5">You have {planOfCareList.length} recommendations from your doctor.</p>
                            </div>
                        </div>

                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-300 text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                                    <th className="pb-2 font-bold">NAME</th>
                                    <th className="pb-2 font-bold">PLANNED DATE</th>
                                    <th className="pb-2 font-bold">INSTRUCTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {planOfCareList.map((plan: any, idx: number) => (
                                    <tr key={idx} className="text-gray-800">
                                        <td className="py-2.5 font-semibold">{plan.name}</td>
                                        <td className="py-2.5">{plan.date}</td>
                                        <td className="py-2.5 text-gray-500">{plan.instructions || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="flex justify-between items-center border-t border-gray-200 mt-12 pt-4 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                <span>MEDICAL HEALTH RECORD: PATIENT PROFILE</span>
                <span>PAGE 1 OF 1</span>
            </div>
        </div>
    );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
        </div>
    )
}

export default function PatientDetailPage() {
    const { id: patientId } = useParams();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);

    const patientDocRef = useMemo(() => {
        if (!patientId || !firestore) return null;
        return doc(firestore, 'patients', patientId as string);
    }, [patientId, firestore]);
    const { data: patient, loading: patientLoading } = useDoc<Patient>(patientDocRef);

    const { user } = useUser();
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const clinicRef = useMemo(() => {
        if (!patient?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', patient.clinicId);
    }, [patient, firestore]);
    const { data: clinic } = useDoc<Clinic>(clinicRef);

    const encountersQuery = useMemo(() => {
        if (!firestore || !patientId || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'encounters'),
            where('clinicId', '==', userProfile.clinicId),
            where('patientId', '==', patientId),
            orderBy('date', 'desc')
        );
    }, [firestore, patientId, userProfile?.clinicId]);
    const { data: encounters } = useCollection<Encounter>(encountersQuery);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        const sections = ['page-1-bio', 'page-2-encounters'];
        setIsDownloading(true);

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            for (let i = 0; i < sections.length; i++) {
                const element = document.getElementById(sections[i]);
                if (!element) continue;

                if (i > 0) pdf.addPage();

                // Capture high quality canvas
                const canvas = await html2canvas(element, {
                    scale: 3, // Increased scale for crispness
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: 210 * 3.7795, // Approximately A4 width in pixels at standard DPI
                });

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }

            pdf.save(`Orelis_Record_${patient?.surname || 'Patient'}_${new Date().getTime()}.pdf`);
            toast({ title: 'Institutional PDF Generated', description: 'Clinical document has been securely compiled.' });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: 'Export Failed', description: 'Error compiling multi-page clinical records.', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied!', description: 'Patient code copied to clipboard.' });
        }).catch(() => {
            toast({ title: 'Error', description: 'Could not copy text.', variant: 'destructive' });
        });
    }

    if (patientLoading) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full noisy-bg">
                <Alert variant="destructive">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Patient Not Found</AlertTitle>
                    <AlertDescription>
                        The patient record you are looking for does not exist or you do not have permission to view it.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (userProfile && userProfile.role !== 'patient' && userProfile.clinicId !== patient.clinicId) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full noisy-bg">
                <Alert variant="destructive">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view this patient's records.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 noisy-bg pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="flex items-center gap-4 print-hidden">
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft />
                        </Button>
                        <h1 className="font-semibold text-lg md:text-2xl">Patient Record</h1>
                        <div className="ml-auto flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex"><Printer className="mr-2 h-4 w-4" />Print</Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloading} className="hidden sm:flex">
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isDownloading ? 'Generating...' : 'Download PDF'}
                            </Button>
                            <Button asChild variant="secondary" size="sm"><Link href={`/dashboard/patients/${patient.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></Button>
                        </div>
                    </div>
                </div>

                {/* Prominent Code Card */}
                <Card className="lg:col-span-1 border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 print-hidden border-dashed">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Secure Linking Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-black tracking-tighter text-primary font-mono">{patient.patientCode}</span>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(patient.patientCode)} className="h-8 w-8 hover:bg-primary/10">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        {(userProfile?.role === 'doctor' || userProfile?.role === 'admin') && (
                            <Button className="w-full mt-4 button-glow gap-2" size="sm" asChild>
                                <Link href={`/dashboard/encounters/new?patientId=${patient.id}`}>
                                    <Stethoscope className="h-4 w-4" />
                                    Start Consultation
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* MULTI-PAGE PRINTABLE CONTAINER (Hidden from UI, used for PDF) */}
            <div className="hidden">
                {/* PAGE 1: BIO & DEMOGRAPHICS */}
                <div id="page-1-bio">
                    <PatientHealthRecordSheet patient={patient} clinic={clinic} encounters={encounters} isPdfMode={true} />
                </div>

                {/* PAGE 2: CLINICAL DATA (ENCOUNTERS) */}
                <div id="page-2-encounters" className="bg-white p-[20mm] w-[210mm] min-h-[297mm] text-black">
                    <MedicalLetterhead clinicName={clinic?.name} clinicAddress={clinic?.address} clinicPhone={clinic?.phone} clinicEmail={clinic?.email} />
                    <div className="border-b-4 border-black pb-4 mb-8">
                        <h2 className="text-4xl font-black uppercase tracking-tight">Clinical History (Encounters)</h2>
                        <p className="font-mono text-sm opacity-60">S.O.A.P RECORDS • VITALS • TREATMENT PLANS</p>
                    </div>

                    <div className="space-y-12">
                        {encounters && encounters.length > 0 ? encounters.map((enc, idx) => (
                            <div key={enc.id} className="border-t border-black pt-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-lg uppercase tracking-tight">{idx + 1}. {enc.type} Encounter</h4>
                                    <p className="font-mono text-xs">{format(new Date(enc.date), 'PPP p')}</p>
                                </div>
                                <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-3 rounded">
                                    {enc.vitals?.map(v => (
                                        <div key={v.id}>
                                            <p className="text-[8px] uppercase font-bold text-gray-400">{v.type.replace('_', ' ')}</p>
                                            <p className="text-sm font-black">{v.value} {v.unit}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Subjective & Objective findings</p>
                                        <p className="text-xs leading-relaxed italic border-l-2 border-gray-200 pl-4">
                                            {enc.soap.subjective || 'N/A'}
                                            <br /><br />
                                            {enc.soap.objective || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Assessment & Care Plan</p>
                                        <p className="text-xs leading-relaxed font-bold">
                                            {enc.soap.assessment || 'N/A'}
                                        </p>
                                        <p className="text-[10px] mt-2 text-gray-600 border-t pt-2 border-dashed">
                                            {enc.soap.plan || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center text-gray-300">
                                <Stethoscope className="h-20 w-20 mx-auto mb-4 opacity-10" />
                                <p className="text-xl font-bold uppercase tracking-widest">No Clinical Records On File</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Health Record Sheet Preview */}
            <div id="printable-area" className="print:hidden">
                <PatientHealthRecordSheet patient={patient} clinic={clinic} encounters={encounters} />
            </div>

            {/* Print-only container */}
            <div className="hidden print:block">
                <PatientHealthRecordSheet patient={patient} clinic={clinic} encounters={encounters} isPdfMode={true} />
            </div>

            {/* Dashboard Telemetry & AI Utilities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 print-hidden">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b border-dashed">
                            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Ontomorph Twin Telemetry</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <TwinVisualizer patientId={patient.id} />
                        </CardContent>
                    </Card>

                    {patient.notes && (
                        <Card className="border-border bg-card shadow-sm">
                            <CardHeader className="pb-3 border-b border-dashed">
                                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">General Archive Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-foreground whitespace-pre-wrap italic opacity-80">{patient.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <WhatIfCoach />

                    {/* Interactive Encounter Log for Doctors */}
                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b border-dashed">
                            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                <span>Clinical Encounter History</span>
                                <Badge variant="outline">{encounters?.length || 0} Encounters</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {encounters && encounters.length > 0 ? encounters.map((enc) => (
                                <div key={enc.id} className="p-4 rounded-xl border border-dashed border-border hover:border-primary/45 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-sm uppercase">{enc.type} Encounter</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(enc.date), 'PPP')}</p>
                                        </div>
                                        <Badge variant={enc.status === 'Finalized' ? 'outline' : 'secondary'} className="text-[10px]">
                                            {enc.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 py-2">
                                        {enc.vitals?.slice(0, 4).map(v => (
                                            <div key={v.id} className="text-center p-1 bg-muted/50 rounded">
                                                <p className="text-[8px] uppercase text-muted-foreground">{v.type.split('_')[0]}</p>
                                                <p className="text-[10px] font-bold">{v.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic mt-2 border-l-2 border-border pl-2">
                                        {enc.soap.assessment}
                                    </p>
                                    <div className="mt-4 flex justify-end">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-1 text-primary hover:bg-primary/5">
                                                    <FileText className="h-3 w-3" /> View Full Details
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden border-dashed">
                                                <DialogHeader className="p-6 bg-primary/5 border-b border-dashed">
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <Stethoscope className="h-5 w-5 text-primary" />
                                                        Clinical Encounter Detail
                                                    </DialogTitle>
                                                    <DialogDescription className="font-mono text-[10px] uppercase">
                                                        Ref: {enc.id} • {format(new Date(enc.date), 'PPP p')}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <ScrollArea className="p-6 max-h-[60vh]">
                                                    <div className="space-y-8 pb-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                            {enc.vitals?.map(v => (
                                                                <div key={v.id} className="p-3 rounded-lg border border-dashed bg-muted/30">
                                                                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{v.type.replace('_', ' ')}</p>
                                                                    <p className="text-sm font-bold">{v.value} <span className="text-[10px] opacity-60">{v.unit}</span></p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="space-y-6">
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 border-b border-dashed pb-1">(S) Subjective</h4>
                                                                <p className="text-sm italic leading-relaxed text-muted-foreground">{enc.soap.subjective || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-dashed pb-1">(O) Objective</h4>
                                                                <p className="text-sm leading-relaxed text-muted-foreground">{enc.soap.objective || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 border-b border-dashed pb-1">(A) Assessment</h4>
                                                                <p className="text-sm font-bold leading-relaxed">{enc.soap.assessment || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2 border-b border-dashed pb-1">(P) Plan</h4>
                                                                <p className="text-sm leading-relaxed text-muted-foreground">{enc.soap.plan || 'N/A'}</p>
                                                            </section>
                                                        </div>

                                                        {enc.prescriptions && enc.prescriptions.length > 0 && (
                                                            <section className="p-4 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <Pill className="h-3 w-3 text-primary" /> Authorized Meds
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {enc.prescriptions.map((p, i) => (
                                                                        <div key={i} className="text-xs font-bold p-2 bg-background rounded border border-dashed flex items-center gap-2">
                                                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                                                            {p}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </section>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                                <div className="p-4 bg-muted/20 border-t border-dashed flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                                                    <span>Physician: {enc.doctorName}</span>
                                                    <span>Status: {enc.status}</span>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No clinical encounters recorded yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
