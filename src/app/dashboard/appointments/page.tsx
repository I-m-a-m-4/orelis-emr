
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, ListFilter, History, Mail, Loader2 } from "lucide-react";
import { AppointmentReminderButton } from "./appointment-reminder-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCollection, type WithPendingWrites } from "@/firebase/firestore/use-collection";
import { collection, query, where, doc, addDoc, getDocs } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase/provider";
import type { Appointment, UserProfile, Patient, Clinic } from "@/lib/types";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useDoc } from "@/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


function AppointmentEmailDialog({ appointment, patient, clinic }: { appointment: Appointment, patient: Patient | undefined, clinic: Clinic | undefined }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState(patient?.email || '');

    const handleSendEmail = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!email) {
            toast({ title: "Email required", description: "Please provide an email address.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        if (!firestore || !clinic) {
            toast({ title: "Error", description: "Could not send email. Please try again.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            const mailCollection = collection(firestore, 'mail');
            await addDoc(mailCollection, {
                to: [email],
                message: {
                    subject: `Appointment Confirmation - ${clinic.name}`,
                    html: `
                        <h1>Appointment Confirmation</h1>
                        <p>Dear ${appointment.patientName},</p>
                        <p>This is a confirmation for your upcoming appointment:</p>
                        <ul>
                            <li><strong>With:</strong> ${appointment.doctorName}</li>
                            <li><strong>At:</strong> ${clinic.name}</li>
                            <li><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</li>
                            <li><strong>Time:</strong> ${new Date(appointment.appointmentDate).toLocaleTimeString()}</li>
                        </ul>
                        <p>If you need to reschedule, please contact us at ${clinic.phone}.</p>
                        <p>We look forward to seeing you.</p>
                    `
                }
            });
            toast({ title: "Email Sent!", description: `Appointment confirmation sent to ${email}.` });
            setOpen(false);
        } catch (error) {
            console.error("Error sending email:", error);
            toast({ title: "Error", description: "Could not send the email. Please try again.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" /> Email Patient
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSendEmail}>
                    <DialogHeader>
                        <DialogTitle>Send Appointment Confirmation</DialogTitle>
                        <DialogDescription>
                            Confirm the recipient's email address below. If it's missing, please add it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="email">Patient Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="patient@example.com"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Email
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AppointmentList({ appointments, loading }: { appointments: WithPendingWrites<Appointment>[] | null, loading: boolean }) {
    const firestore = useFirestore();

    const [patientsData, setPatientsData] = useState<Record<string, Patient>>({});
    const [clinicsData, setClinicsData] = useState<Record<string, Clinic>>({});
    const [isLoadingExtra, setIsLoadingExtra] = useState(false);

    const { data: userProfile } = useDoc<UserProfile>(doc(useFirestore()!, 'users', useUser().user?.uid ?? ''));

    useEffect(() => {
        if (!appointments || appointments.length === 0 || !firestore || !userProfile?.clinicId) return;

        const patientIds = Array.from(new Set(appointments.map(a => a.patientId)));
        const clinicIds = Array.from(new Set(appointments.map(a => a.clinicId)));

        // Avoid fetching if IDs are not present
        if (patientIds.length === 0 || clinicIds.length === 0) return;

        const fetchExtraData = async () => {
            setIsLoadingExtra(true);
            try {
                // Fetch patients
                const patientsRef = collection(firestore, 'patients');
                const patientQuery = query(
                    patientsRef,
                    where('__name__', 'in', patientIds),
                    where('clinicId', '==', userProfile.clinicId)
                );
                const patientSnap = await getDocs(patientQuery);
                const newPatientsData: Record<string, Patient> = {};
                patientSnap.forEach(doc => {
                    newPatientsData[doc.id] = { id: doc.id, ...doc.data() } as Patient;
                });
                setPatientsData(newPatientsData);

                // Fetch clinics
                const clinicsRef = collection(firestore, 'clinics');
                const clinicQuery = query(clinicsRef, where('__name__', 'in', clinicIds));
                const clinicSnap = await getDocs(clinicQuery);
                const newClinicsData: Record<string, Clinic> = {};
                clinicSnap.forEach(doc => {
                    newClinicsData[doc.id] = { id: doc.id, ...doc.data() } as Clinic;
                });
                setClinicsData(newClinicsData);
            } catch (error) {
                console.error("Error fetching related data for appointments:", error);
            } finally {
                setIsLoadingExtra(false);
            }
        };

        fetchExtraData();
    }, [appointments, firestore, userProfile?.clinicId]);

    if (loading) {
        return <p className="text-center text-muted-foreground py-12">Loading appointments...</p>;
    }
    if (!appointments || appointments.length === 0) {
        return <p className="text-center text-muted-foreground py-12">No appointments in this category.</p>;
    }
    return (
        <div className="space-y-4">
            {appointments.map(appt => {
                const patient = patientsData[appt.patientId];
                const clinic = clinicsData[appt.clinicId];
                return (
                    <Card key={appt.id} className={`${appt.hasPendingWrites ? 'bg-muted/30' : ''}`}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <Avatar className="h-14 w-14">
                                    <AvatarFallback className="text-xl">{getInitials(appt.patientName)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="font-semibold flex items-center gap-2">
                                        {appt.patientName}
                                        {appt.hasPendingWrites && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <History className="h-4 w-4 text-muted-foreground animate-pulse" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Changes pending, will sync when online.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </p>
                                    <p className="text-sm text-muted-foreground">with {appt.doctorName}</p>
                                </div>
                            </div>
                            <div className="flex flex-row sm:flex-col justify-between sm:text-right text-sm gap-2">
                                <div>
                                    <p className="font-medium">{new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                    <p className="text-muted-foreground">{new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2">
                                    {appt.status === 'Scheduled' && userProfile?.role !== 'patient' && (
                                        <>
                                            <AppointmentReminderButton appointment={{
                                                patientName: appt.patientName,
                                                appointmentTime: appt.appointmentDate,
                                                doctorName: appt.doctorName,
                                            }} />
                                            <AppointmentEmailDialog appointment={appt} patient={patient} clinic={clinic} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
}

export default function AppointmentsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState("upcoming");

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const appointmentsQuery = useMemo(() => {
        if (!firestore || !userProfile) return null;

        const appointmentsCollection = collection(firestore, 'appointments');
        if (userProfile.role === 'patient') {
            if (!userProfile.patientId) return null;
            return query(appointmentsCollection, where('patientId', '==', userProfile.patientId));
        }

        if (userProfile.clinicId) {
            return query(appointmentsCollection, where('clinicId', '==', userProfile.clinicId));
        }

        return null;
    }, [firestore, userProfile]);

    const { data: allAppointments, loading } = useCollection<Appointment>(appointmentsQuery);

    const upcomingAppointments = allAppointments?.filter(a => new Date(a.appointmentDate) >= new Date() && a.status === 'Scheduled')
        .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

    const pastAppointments = allAppointments?.filter(a => new Date(a.appointmentDate) < new Date() && a.status === 'Completed');

    const cancelledAppointments = allAppointments?.filter(a => a.status === 'Cancelled');

    const isLoading = loading || profileLoading;

    const canSchedule = userProfile?.role === 'admin' || userProfile?.role === 'doctor' || userProfile?.role === 'receptionist';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Appointments</h1>
                <div className="ml-auto flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Filter
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem checked>
                                Doctor
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem>Patient</DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {canSchedule && (
                        <Button size="sm" className="h-8 gap-1" asChild>
                            <Link href="/dashboard/appointments/new">
                                <CalendarPlus className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Schedule Appointment
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div className="relative border p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                        <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming">
                        <AppointmentList appointments={upcomingAppointments || []} loading={isLoading} />
                    </TabsContent>
                    <TabsContent value="past">
                        <AppointmentList appointments={pastAppointments || []} loading={isLoading} />
                    </TabsContent>
                    <TabsContent value="cancelled">
                        <AppointmentList appointments={cancelledAppointments || []} loading={isLoading} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
