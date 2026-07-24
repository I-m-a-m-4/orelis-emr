
'use client';

import { useState, useMemo, type FormEvent, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, User, Stethoscope, Search, CheckCircle2, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, addDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Patient, Appointment } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";

export default function NewAppointmentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const patientsQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile?.clinicId]);
    const { data: patients, loading: patientsLoading } = useCollection<Patient>(patientsQuery);

    const doctorsQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(collection(firestore, 'users'), where('role', '==', 'doctor'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile?.clinicId]);
    const { data: doctors, loading: doctorsLoading } = useCollection<UserProfile>(doctorsQuery);

    const recentAppointmentsQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'appointments'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('appointmentDate', 'desc'),
            limit(10)
        );
    }, [firestore, userProfile?.clinicId]);
    const { data: recentAppointments } = useCollection<Appointment>(recentAppointmentsQuery);

    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [patientSearch, setPatientSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState<Date>();
    const [isSaving, setIsSaving] = useState(false);

    const filteredPatients = useMemo(() => {
        if (!patients) return [];
        return patients.filter(p =>
            p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.surname.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.patientCode.toLowerCase().includes(patientSearch.toLowerCase())
        );
    }, [patients, patientSearch]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        if (!firestore || !userProfile?.clinicId || !appointmentDate || !selectedPatientId) {
            toast({
                title: 'Error!',
                description: 'Please select a patient and a date.',
                variant: 'destructive',
            });
            setIsSaving(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        const doctorId = formData.get('doctorId') as string;
        const reason = formData.get('reason') as string;

        const selectedPatient = patients?.find(p => p.id === selectedPatientId);
        const selectedDoctor = doctors?.find(d => d.uid === doctorId);

        if (!selectedPatient || !selectedDoctor) {
            toast({
                title: 'Error!',
                description: 'Invalid patient or doctor selected.',
                variant: 'destructive',
            });
            setIsSaving(false);
            return;
        }

        const appointmentData = {
            clinicId: userProfile.clinicId,
            patientId: selectedPatient.id,
            patientName: `${selectedPatient.firstName} ${selectedPatient.surname}`,
            doctorId: selectedDoctor.uid,
            doctorName: selectedDoctor.name,
            appointmentDate: appointmentDate.toISOString(),
            reason: reason,
            status: 'Scheduled',
        };

        try {
            const appointmentsCollection = collection(firestore, 'appointments');
            await addDoc(appointmentsCollection, appointmentData);

            // Log audit
            await addDoc(collection(firestore, 'audit_logs'), {
                clinicId: userProfile.clinicId,
                action: 'SCHEDULE_APPOINTMENT',
                timestamp: new Date().toISOString(),
                details: `Appointment scheduled for ${selectedPatient.firstName} with Dr. ${selectedDoctor.name}`
            });

            toast({
                title: 'Success!',
                description: 'Appointment scheduled successfully.',
            });
            router.push('/dashboard/appointments');
        } catch (error: any) {
            toast({
                title: 'Error!',
                description: error.message || 'Could not schedule appointment.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8">
            <div className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-2xl tracking-tighter">Clinical Scheduler</h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Side: Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit}>
                        <Card className="border-dashed overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-dashed">
                                <CardTitle>Schedule New Appointment</CardTitle>
                                <CardDescription>Enter details to book a consultation slot.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 grid gap-6">
                                {/* Patient Search */}
                                <div className="space-y-2 relative">
                                    <Label>Select Patient <span className="text-primary">*</span></Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by Name or Unique Code (e.g. OR-X9J2)"
                                            className="pl-9 h-11 border-dashed focus-visible:ring-primary"
                                            value={patientSearch}
                                            onChange={(e) => {
                                                setPatientSearch(e.target.value);
                                                setIsSearchOpen(true);
                                                setSelectedPatientId(''); // Reset selection if searching
                                            }}
                                            onFocus={() => setIsSearchOpen(true)}
                                        />
                                    </div>

                                    {isSearchOpen && patientSearch.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-auto border-dashed shadow-2xl animate-in fade-in slide-in-from-top-2">
                                            <CardContent className="p-0">
                                                {filteredPatients.length === 0 ? (
                                                    <div className="p-8 text-center text-sm text-muted-foreground">No matching patients found.</div>
                                                ) : (
                                                    filteredPatients.map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="flex items-center justify-between p-3 hover:bg-primary/5 cursor-pointer border-b last:border-0 transition-colors"
                                                            onClick={() => {
                                                                setSelectedPatientId(p.id);
                                                                setPatientSearch(`${p.firstName} ${p.surname}`);
                                                                setIsSearchOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm tracking-tight">{p.firstName} {p.surname}</span>
                                                                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 py-0">{p.patientCode}</Badge>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">{p.phone || p.email || 'No contact info'}</span>
                                                            </div>
                                                            <CheckCircle2 className={cn("h-4 w-4 text-primary opacity-0", selectedPatientId === p.id && "opacity-100")} />
                                                        </div>
                                                    ))
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {selectedPatientId && (
                                        <div className="mt-2 text-[10px] text-primary flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Selected active record
                                        </div>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="doctorId">Assigned Doctor</Label>
                                        <Select name="doctorId" disabled={doctorsLoading}>
                                            <SelectTrigger className="h-11 border-dashed">
                                                <SelectValue placeholder={doctorsLoading ? "Syncing doctors..." : "Select doctor"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {doctors?.map(doctor => (
                                                    <SelectItem key={doctor.uid} value={doctor.uid}>
                                                        <div className="flex items-center gap-2">
                                                            <Stethoscope className="h-4 w-4" />
                                                            <span>Dr. {doctor.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Appointment Slot</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-11 justify-start text-left font-normal border-dashed",
                                                        !appointmentDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {appointmentDate ? format(appointmentDate, "PPP p") : <span>Set Date & Time</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-dashed" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={appointmentDate}
                                                    onSelect={setAppointmentDate}
                                                    initialFocus
                                                />
                                                <div className="p-3 border-t border-dashed bg-muted/30">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                        <Input
                                                            type="time"
                                                            className="h-8 text-xs"
                                                            onChange={(e) => {
                                                                const time = e.target.value;
                                                                if (!time) return;
                                                                const [hours, minutes] = time.split(':');
                                                                const newDate = new Date(appointmentDate || new Date());
                                                                newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                                                                setAppointmentDate(newDate);
                                                            }}
                                                            value={appointmentDate ? format(appointmentDate, 'HH:mm') : ''}
                                                        />
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Clinical Reason</Label>
                                    <Input id="reason" name="reason" placeholder="e.g., Post-op Followup, Chest Pain Review" className="h-11 border-dashed" />
                                </div>
                            </CardContent>
                            <div className="flex items-center p-6 pt-0 bg-primary/5 border-t border-dashed justify-between">
                                <Button variant="ghost" type="button" onClick={() => router.back()} disabled={isSaving}>Discard</Button>
                                <Button type="submit" disabled={isSaving || !selectedPatientId} className="button-glow px-8">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isSaving ? 'Processing...' : 'Finalize Appointment'}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>

                {/* Right Side: Quick Select */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">Today's Visits</h3>
                    </div>
                    {recentAppointments?.filter(a => isToday(new Date(a.appointmentDate))).length === 0 ? (
                        <Card className="border-dashed bg-muted/20">
                            <CardContent className="p-4 text-center text-xs text-muted-foreground italic">
                                No other appointments scheduled for today yet.
                            </CardContent>
                        </Card>
                    ) : (
                        recentAppointments?.filter(a => isToday(new Date(a.appointmentDate))).map(app => (
                            <Card
                                key={app.id}
                                className="border-dashed hover:border-primary/50 cursor-pointer transition-all group"
                                onClick={() => {
                                    setSelectedPatientId(app.patientId);
                                    setPatientSearch(app.patientName);
                                }}
                            >
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold group-hover:text-primary transition-colors">{app.patientName}</span>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(app.appointmentDate), "p")} • {app.reason}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[9px]">Already Scheduled</Badge>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    <div className="pt-4 flex items-center gap-2 px-1">
                        <User className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">Recently Scheduled</h3>
                    </div>
                    <div className="grid gap-2">
                        {recentAppointments?.slice(0, 5).map(app => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-dashed hover:bg-primary/5 cursor-pointer transition-colors"
                                onClick={() => {
                                    setSelectedPatientId(app.patientId);
                                    setPatientSearch(app.patientName);
                                }}
                            >
                                <div className="text-[11px] font-medium">{app.patientName}</div>
                                <div className="text-[9px] text-muted-foreground">{format(new Date(app.appointmentDate), "MMM d")}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
