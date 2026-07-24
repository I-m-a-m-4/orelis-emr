
'use client';

import { useActionState, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import type { Patient } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { updatePatientAction } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="button-glow">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Saving Changes...' : 'Save Changes'}
        </Button>
    );
}

function EditPatientForm({ patient }: { patient: Patient }) {
    const router = useRouter();
    const { toast } = useToast();
    const [state, formAction] = useActionState(updatePatientAction, { isSuccess: false, message: '', errors: undefined });
    const [dob, setDob] = useState<Date | undefined>(patient.dob ? new Date(patient.dob) : undefined);
    const [currentCode, setCurrentCode] = useState(patient.patientCode || '');

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCurrentCode(result);
        toast({ title: 'Generated!', description: 'New unique code generated. Save changes to apply.' });
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied!', description: 'Patient code copied to clipboard.' });
        }).catch(() => {
            toast({ title: 'Error', description: 'Could not copy text.', variant: 'destructive' });
        });
    }

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.isSuccess ? 'Success!' : 'Error!',
                description: state.message,
                variant: state.isSuccess ? 'default' : 'destructive',
            });
            if (state.isSuccess) {
                router.push(`/dashboard/patients/${patient.id}`);
            }
        }
    }, [state, toast, router, patient.id]);

    return (
        <form action={formAction}>
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="clinicId" value={patient.clinicId} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 border-dashed border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center justify-between">
                            Access Credentials
                            <Badge variant="outline" className="bg-background text-[8px]">Secure</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-sm">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Patient Unique Code</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    name="patientCode"
                                    value={currentCode}
                                    onChange={(e) => setCurrentCode(e.target.value.toUpperCase())}
                                    className="bg-background border-dashed font-mono text-center font-bold tracking-widest h-10"
                                />
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="border-dashed"
                                        onClick={() => copyToClipboard(currentCode)}
                                        title="Copy to clipboard"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-dashed text-[10px] h-10"
                                        onClick={generateCode}
                                    >
                                        Generate New
                                    </Button>
                                </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-tight italic">
                                * Give this code to the patient to link their records in the Orelis Patient Portal.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-dashed">
                    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" name="firstName" defaultValue={patient.firstName} /></div>
                        <div className="space-y-2"><Label htmlFor="surname">Surname</Label><Input id="surname" name="surname" defaultValue={patient.surname} /></div>
                        <div className="space-y-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dob && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dob} onSelect={setDob} initialFocus /></PopoverContent>
                            </Popover>
                            <input type="hidden" name="dob" value={dob?.toISOString()} />
                        </div>
                        <div className="space-y-2"><Label htmlFor="sex">Sex</Label><Select name="sex" defaultValue={patient.sex}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="maritalStatus">Marital Status</Label><Select name="maritalStatus" defaultValue={patient.maritalStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Divorced">Divorced</SelectItem><SelectItem value="Widowed">Widowed</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="occupation">Occupation</Label><Input id="occupation" name="occupation" defaultValue={patient.occupation} /></div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-dashed">
                    <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" name="phone" defaultValue={patient.phone} /></div>
                        <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" defaultValue={patient.email} /></div>
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={patient.address} /></div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-dashed">
                    <CardHeader><CardTitle>Other Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="origin">State of Origin</Label><Input id="origin" name="origin" defaultValue={patient.origin} /></div>
                        <div className="space-y-2"><Label htmlFor="tribe">Tribe</Label><Input id="tribe" name="tribe" defaultValue={patient.tribe} /></div>
                        <div className="space-y-2"><Label htmlFor="religion">Religion</Label><Input id="religion" name="religion" defaultValue={patient.religion} /></div>
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">General Notes</Label><Textarea id="notes" name="notes" defaultValue={patient.notes} className="min-h-[150px]" /></div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-dashed">
                    <CardHeader><CardTitle>Next of Kin</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="nextOfKinName">Full Name</Label><Input id="nextOfKinName" name="nextOfKinName" defaultValue={patient.nextOfKin?.name} /></div>
                        <div className="space-y-2"><Label htmlFor="nextOfKinRelation">Relation</Label><Input id="nextOfKinRelation" name="nextOfKinRelation" defaultValue={patient.nextOfKin?.relation} /></div>
                        <div className="space-y-2"><Label htmlFor="nextOfKinPhone">Phone Number</Label><Input id="nextOfKinPhone" name="nextOfKinPhone" defaultValue={patient.nextOfKin?.phone} /></div>
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="nextOfKinAddress">Address</Label><Input id="nextOfKinAddress" name="nextOfKinAddress" defaultValue={patient.nextOfKin?.address} /></div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <SubmitButton />
            </div>
        </form>
    );
}


export default function EditPatientPage() {
    const { id: patientId } = useParams();
    const firestore = useFirestore();

    const patientDocRef = useMemo(() => {
        if (!patientId || !firestore) return null;
        return doc(firestore, 'patients', Array.isArray(patientId) ? patientId[0] : patientId);
    }, [patientId, firestore]);

    const { data: patient, loading } = useDoc<Patient>(patientDocRef);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/4" />
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (!patient) {
        return <div>Patient not found.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="font-semibold text-lg md:text-2xl">Edit Patient: {patient.firstName} {patient.surname}</h1>
            <EditPatientForm patient={patient} />
        </div>
    );
}
