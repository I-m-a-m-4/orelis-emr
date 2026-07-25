'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Calendar,
    ClipboardList,
    FileText,
    Lock,
    User,
    ArrowRight,
    Activity,
    Clock,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/lib/types';

const safeFormat = (dateVal: any, formatStr: string): string => {
    if (!dateVal) return 'N/A';
    try {
        if (typeof dateVal.toDate === 'function') {
            return format(dateVal.toDate(), formatStr);
        }
        if (typeof dateVal === 'object' && 'seconds' in dateVal) {
            return format(new Date(dateVal.seconds * 1000), formatStr);
        }
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 'N/A';
        return format(d, formatStr);
    } catch (e) {
        return 'N/A';
    }
};

export default function PatientPortal() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const [patientCode, setPatientCode] = useState('');
    const [surname, setSurname] = useState('');
    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [encounters, setEncounters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        setIsLoading(true);
        try {
            // Find patient by code and surname (normalized)
            const patientsRef = collection(firestore, 'patients');
            const q = query(
                patientsRef,
                where('patientCode', '==', patientCode.toUpperCase().trim())
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({
                    title: "Verification Failed",
                    description: "No record found matching this Patient Code.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            const docData = querySnapshot.docs[0].data() as Patient;
            const patientId = querySnapshot.docs[0].id;

            // Verify surname (case-insensitive)
            if (docData.surname.toLowerCase() !== surname.toLowerCase().trim()) {
                toast({
                    title: "Access Denied",
                    description: "The surname provided does not match our records for this code.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            const patientData = { ...docData, id: patientId } as Patient;
            setPatient(patientData);

            // Fetch appointments - Correcting field name from 'date' to 'appointmentDate'
            const apptsRef = collection(firestore, 'appointments');
            const apptsQ = query(apptsRef, where('patientId', '==', patientData.id), orderBy('appointmentDate', 'desc'), limit(5));
            const apptsSnapshot = await getDocs(apptsQ);
            setAppointments(apptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch encounters
            const encountersRef = collection(firestore, 'encounters');
            const encountersQ = query(encountersRef, where('patientId', '==', patientData.id), orderBy('date', 'desc'), limit(5));
            const encountersSnapshot = await getDocs(encountersQ);
            setEncounters(encountersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            setIsLoggedIn(true);
            toast({
                title: "Authentication Successful",
                description: `Authorized access for ${patientData.firstName} ${patientData.surname}`,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Security Exception",
                description: error.message || "Credential verification sync error. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setPatient(null);
        setPatientCode('');
        setSurname('');
    };

    if (!isLoggedIn || !patient) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
                <div className="mb-8">
                    <OrelisLogo />
                </div>
                <Card className="w-full max-w-md border-dashed border-primary/30 bg-card/40 backdrop-blur-xl text-card-foreground">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                            <Lock className="h-5 w-5 text-primary" /> Patient Portal Access
                        </CardTitle>
                        <CardDescription>Enter the code provided by your hospital to view your medical records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="patientCode">Patient Code</Label>
                                <Input
                                    id="patientCode"
                                    placeholder="e.g. ORL-X1Y2Z3"
                                    value={patientCode}
                                    onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
                                    className="uppercase font-mono tracking-widest text-center text-lg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surname">Surname</Label>
                                <Input
                                    id="surname"
                                    placeholder="Enter your surname"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full button-glow mt-4" disabled={isLoading}>
                                {isLoading ? "Verifying..." : "Access My Records"} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <p className="mt-8 text-xs text-muted-foreground">
                    Don't have a code? Contact your hospital's reception to get your unique Orelis Access Code.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 animate-in fade-in duration-700">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-dashed border-primary/20 pb-6">
                    <div className="flex items-center gap-4">
                        <OrelisLogo />
                        <div className="h-8 w-[1px] bg-primary/20 hidden md:block"></div>
                        <h2 className="text-xl font-bold">Patient Portal</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar Profile */}
                    <Card className="border-dashed border-primary/20 bg-primary/5 h-fit">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/30">
                                <User className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{patient.firstName} {patient.surname}</CardTitle>
                            <CardDescription>Patient Code: {patient.patientCode}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="pt-4 border-t border-dashed border-primary/10">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Personal Summary</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Sex</span>
                                        <span>{patient.sex}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Marital Status</span>
                                        <span>{patient.maritalStatus}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Registered</span>
                                        <span>{safeFormat(patient.registrationDate, 'PP')}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Upcoming Appointments */}
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" /> Upcoming Appointments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {appointments.length > 0 ? (
                                    <div className="space-y-4">
                                        {appointments.map((appt) => (
                                            <div key={appt.id} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center px-3 py-1 bg-primary/20 rounded-lg">
                                                        <p className="text-xs font-bold">{safeFormat(appt.appointmentDate, 'MMM')}</p>
                                                        <p className="text-xl font-bold">{safeFormat(appt.appointmentDate, 'dd')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{appt.type}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {safeFormat(appt.appointmentDate, 'p')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px]">
                                                    {appt.status || 'Scheduled'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center bg-muted/5 rounded-xl border border-dashed">
                                        <p className="text-sm text-muted-foreground">No upcoming appointments found.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Medical Records */}
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" /> Medical Records & Documents
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {encounters.length > 0 ? (
                                    <div className="space-y-4">
                                        {encounters.map((enc) => (
                                            <div key={enc.id} className="p-4 rounded-xl bg-card/40 border border-primary/10 hover:border-primary/30 transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-primary uppercase mb-1">{safeFormat(enc.date, 'PPPP')}</p>
                                                        <h4 className="font-semibold">Clinical Encounter: {enc.type}</h4>
                                                    </div>
                                                    <Badge className="bg-primary/20 text-primary border-none">{enc.status}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="p-2 rounded bg-primary/5">
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Assessment</p>
                                                        <p className="text-xs line-clamp-2 mt-1">{enc.soap?.assessment || 'No details'}</p>
                                                    </div>
                                                    <div className="p-2 rounded bg-primary/5">
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Medications</p>
                                                        <p className="text-xs line-clamp-2 mt-1">{enc.prescriptions?.join(', ') || 'None prescribed'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-dashed border-primary/10 flex justify-between items-center transition-opacity">
                                                    <p className="text-[10px] text-muted-foreground italic">Digitally signed by {enc.doctorName}</p>
                                                    <Button variant="link" size="sm" onClick={() => setSelectedEncounter(enc)} className="h-auto p-0 text-primary text-xs">View Full Details</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center bg-muted/5 rounded-xl border border-dashed">
                                        <p className="text-sm text-muted-foreground">No medical encounters recorded yet.</p>
                                    </div>
                                )
                                }
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <footer className="mt-12 py-8 border-t border-dashed border-primary/10 text-center">
                <p className="text-xs text-muted-foreground">
                    &copy; 2026 Orelis Health. All patient data is encrypted and secure.
                </p>
            </footer>

            <Dialog open={!!selectedEncounter} onOpenChange={(open) => !open && setSelectedEncounter(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> {selectedEncounter?.type || 'Encounter Details'}
                        </DialogTitle>
                        <DialogDescription>
                            Date: {selectedEncounter ? safeFormat(selectedEncounter.date, 'PPPP p') : ''} | Provider: {selectedEncounter?.doctorName || 'N/A'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEncounter && (
                        <div className="space-y-6 py-4">
                            {/* SOAP Notes */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-primary uppercase tracking-wider border-b border-primary/15 pb-1">Clinical SOAP Note</h3>
                                
                                {selectedEncounter.soap?.subjective && (
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Subjective (History & Complaints)</h4>
                                        <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-wrap">{selectedEncounter.soap.subjective}</p>
                                    </div>
                                )}

                                {selectedEncounter.soap?.objective && (
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Objective (Physical Examination & Vitals Summary)</h4>
                                        <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-wrap">{selectedEncounter.soap.objective}</p>
                                    </div>
                                )}

                                {selectedEncounter.soap?.assessment && (
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Assessment (Diagnosis & Clinical Impressions)</h4>
                                        <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-wrap">{selectedEncounter.soap.assessment}</p>
                                    </div>
                                )}

                                {selectedEncounter.soap?.plan && (
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Plan & Treatment</h4>
                                        <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-wrap">{selectedEncounter.soap.plan}</p>
                                    </div>
                                )}
                            </div>

                            {/* Vitals / Observations */}
                            {selectedEncounter.vitals && selectedEncounter.vitals.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wider border-b border-primary/15 pb-1">Vitals & Observations</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {selectedEncounter.vitals.map((v: any, index: number) => (
                                            <div key={v.id || index} className="p-3 rounded-xl bg-card border border-primary/10 flex flex-col justify-center">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">{v.type?.replace('_', ' ')}</span>
                                                <span className="text-lg font-bold text-foreground mt-1">{v.value} <span className="text-xs font-normal text-muted-foreground">{v.unit}</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Prescriptions */}
                            {selectedEncounter.prescriptions && selectedEncounter.prescriptions.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wider border-b border-primary/15 pb-1">Prescriptions</h3>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                        {selectedEncounter.prescriptions.map((med: string, index: number) => (
                                            <li key={index} className="font-medium text-primary">{med}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Lab Orders */}
                            {selectedEncounter.labOrders && selectedEncounter.labOrders.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wider border-b border-primary/15 pb-1">Lab Orders</h3>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                        {selectedEncounter.labOrders.map((lab: string, index: number) => (
                                            <li key={index} className="font-medium text-primary">{lab}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="text-right text-[10px] text-muted-foreground italic pt-4 border-t border-dashed border-primary/10">
                                Electronic Health Record • Digitally signed by Dr. {selectedEncounter.doctorName}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
