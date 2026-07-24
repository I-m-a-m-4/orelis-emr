
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Clinic, Patient } from '@/lib/types';
import { useCollection } from "@/firebase/firestore/use-collection";
import { useState, useEffect, type FormEvent, useMemo } from "react";
import { FileText, Link as LinkIcon, Barcode, Loader2, Calendar, Pill, Activity, Stethoscope } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LoadingAnimation } from "@/components/layout/loading-animation";


function LinkRecordForm({ user }: { user: User }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isLinking, setIsLinking] = useState(false);

    const clinicsCollection = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, 'clinics');
    }, [firestore]);
    const { data: clinics, loading: clinicsLoading } = useCollection<Clinic>(clinicsCollection);

    const handleLinkRecord = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !user) return;
        setIsLinking(true);

        const formData = new FormData(e.currentTarget);
        const clinicId = formData.get('clinic') as string;
        const patientCode = formData.get('patient-code') as string;

        if (!clinicId || !patientCode) {
            toast({ title: "Missing Information", description: "Please select a clinic and enter your Patient Code.", variant: "destructive" });
            setIsLinking(false);
            return;
        }

        try {
            const patientsRef = collection(firestore, 'patients');
            const q = query(patientsRef, where("clinicId", "==", clinicId), where("patientCode", "==", patientCode.toUpperCase()));

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ title: "Record Not Found", description: "The Patient Code could not be found for the selected clinic. Please check your details and try again.", variant: "destructive" });
                setIsLinking(false);
                return;
            }

            const patientDoc = querySnapshot.docs[0];

            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                patientId: patientDoc.id
            });

            toast({ title: "Success!", description: "Your account has been linked to your medical record." });
            router.push('/dashboard');
            router.refresh();

        } catch (error) {
            console.error("Error linking record:", error);
            toast({ title: "Error", description: "An unexpected error occurred while linking your record.", variant: "destructive" });
        } finally {
            setIsLinking(false);
        }
    }

    return (
        <Card className="border-dashed w-full max-w-2xl bg-background/50 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                        <LinkIcon className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-headline">Link Your Clinic Record</CardTitle>
                <CardDescription>
                    Enter the Patient Code provided by your clinic to securely access your medical records.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLinkRecord} className="grid gap-6 md:grid-cols-1">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="clinic-select">Select Your Clinic</Label>
                            <Select name="clinic" disabled={clinicsLoading || isLinking}>
                                <SelectTrigger id="clinic-select" className="bg-background/70">
                                    <SelectValue placeholder={clinicsLoading ? "Loading clinics..." : "Choose a hospital"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {clinics?.map(clinic => (
                                        <SelectItem key={clinic.id!} value={clinic.id!}>{clinic.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="patient-code">Enter Your Patient Code</Label>
                            <Input id="patient-code" name="patient-code" placeholder="e.g., K8F3T9" className="bg-background/70 uppercase" disabled={isLinking} />
                        </div>
                        <Button className="w-full" type="submit" disabled={isLinking || clinicsLoading}>
                            {isLinking ? <Loader2 className="mr-2 animate-spin" /> : <Barcode className="mr-2" />}
                            {isLinking ? 'Linking...' : 'Link My Records'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

function LinkedRecordView({ patientId }: { patientId: string }) {
    const firestore = useFirestore();

    const encountersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'encounters'), where('patientId', '==', patientId), orderBy('date', 'desc'));
    }, [firestore, patientId]);
    const { data: encounters, loading: encountersLoading } = useCollection<Encounter>(encountersQuery);

    const prescriptionsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'prescriptions'), where('patientId', '==', patientId), orderBy('date', 'desc'));
    }, [firestore, patientId]);
    const { data: prescriptions, loading: prescriptionsLoading } = useCollection<any>(prescriptionsQuery);

    const appointmentsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'appointments'), where('patientId', '==', patientId), orderBy('appointmentDate', 'desc'));
    }, [firestore, patientId]);
    const { data: appointments, loading: appointmentsLoading } = useCollection<any>(appointmentsQuery);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-lg md:text-2xl">My Medical Records</h1>
            </div>

            <Tabs defaultValue="encounters" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="encounters">
                        <Stethoscope className="mr-2 h-4 w-4" />
                        Visits
                    </TabsTrigger>
                    <TabsTrigger value="prescriptions">
                        <Pill className="mr-2 h-4 w-4" />
                        Prescriptions
                    </TabsTrigger>
                    <TabsTrigger value="appointments">
                        <Calendar className="mr-2 h-4 w-4" />
                        Appointments
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="encounters">
                    <div className="grid gap-4">
                        {encountersLoading ? (
                            <LoadingAnimation />
                        ) : encounters && encounters.length > 0 ? (
                            encounters.map(encounter => (
                                <Card key={encounter.id} className="border-dashed">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">{encounter.type} - {encounter.diagnosis || 'General Checkup'}</CardTitle>
                                                <CardDescription>{format(new Date(encounter.date), "PPP")} • Dr. {encounter.doctorName}</CardDescription>
                                            </div>
                                            <Badge variant={encounter.status === 'Finalized' ? "default" : "secondary"}>
                                                {encounter.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {encounter.soap?.subjective && (
                                                <div className="text-sm">
                                                    <span className="font-bold uppercase text-[10px] text-primary block mb-1">Subjective</span>
                                                    <p className="text-muted-foreground">{encounter.soap.subjective}</p>
                                                </div>
                                            )}
                                            {encounter.soap?.assessment && (
                                                <div className="text-sm">
                                                    <span className="font-bold uppercase text-[10px] text-primary block mb-1">Assessment</span>
                                                    <p className="text-muted-foreground">{encounter.soap.assessment}</p>
                                                </div>
                                            )}
                                            {encounter.soap?.plan && (
                                                <div className="text-sm">
                                                    <span className="font-bold uppercase text-[10px] text-primary block mb-1">Plan</span>
                                                    <p className="text-muted-foreground">{encounter.soap.plan}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-12 bg-muted/20 border border-dashed rounded-lg">No medical visits found.</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="prescriptions">
                    <div className="grid gap-4">
                        {prescriptionsLoading ? (
                            <LoadingAnimation />
                        ) : prescriptions && prescriptions.length > 0 ? (
                            prescriptions.map((prescription: any) => (
                                <Card key={prescription.id} className="border-dashed">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Prescription from Dr. {prescription.doctorName}</CardTitle>
                                                <CardDescription>{format(new Date(prescription.date), "PPP")}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="border-primary/20 text-primary">{prescription.status}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {prescription.medications?.map((med: any, i: number) => (
                                                <li key={i} className="text-sm p-3 bg-muted/30 rounded flex justify-between items-center group hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <span className="font-bold">{med.name}</span>
                                                        <p className="text-xs text-muted-foreground">{med.dosage} • {med.frequency} • {med.duration}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-12 bg-muted/20 border border-dashed rounded-lg">No prescriptions found.</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="appointments">
                    <div className="grid gap-4">
                        {appointmentsLoading ? (
                            <LoadingAnimation />
                        ) : appointments && appointments.length > 0 ? (
                            appointments.map((appointment: any) => (
                                <Card key={appointment.id} className="border-dashed">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Appointment with Dr. {appointment.doctorName}</CardTitle>
                                                <CardDescription>
                                                    {format(new Date(appointment.appointmentDate), "PPP")} at {format(new Date(appointment.appointmentDate), "p")}
                                                </CardDescription>
                                            </div>
                                            <Badge className={cn(
                                                appointment.status === 'Scheduled' && "bg-blue-500",
                                                appointment.status === 'Completed' && "bg-primary",
                                                appointment.status === 'Cancelled' && "bg-destructive"
                                            )}>
                                                {appointment.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-medium">Reason: <span className="text-muted-foreground font-normal">{appointment.reason}</span></p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-12 bg-muted/20 border border-dashed rounded-lg">No appointments found.</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function MyRecordsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = userLoading || profileLoading;

    if (isLoading) {
        return <LoadingAnimation />;
    }

    if (userProfile?.role !== 'patient') {
        // Redirect non-patients or show an error
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full noisy-bg">
                <Alert variant="destructive" className="max-w-md border-dashed">
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        This page is for patient accounts only.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (userProfile.patientId) {
        return <LinkedRecordView patientId={userProfile.patientId} />;
    }

    // Only render the form if the user is a patient and has NOT linked their record.
    return (
        <div className="flex flex-col items-center justify-center h-full noisy-bg -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
            {user && <LinkRecordForm user={user} />}
            <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm">
                Your Patient Code is a unique code provided by your hospital on your patient card. It allows us to securely fetch your medical records. If you can't find it, please contact your clinic.
            </p>
        </div>
    );
}

