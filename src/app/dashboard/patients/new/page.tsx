
'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, PlusIcon, Trash2, CheckCircle2, Copy, ExternalLink, Stethoscope, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from "@/components/ui/calendar";
import { cn, generatePatientCode } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { createPatient } from '@/lib/data/patients';
import type { UserProfile } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

type CustomField = {
    id: number;
    key: string;
    value: string;
    type: 'text' | 'textarea';
};

export default function AddPatientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const [dob, setDob] = useState<Date>();
    const [patientCode, setPatientCode] = useState(generatePatientCode());
    const [isSaving, setIsSaving] = useState(false);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [successData, setSuccessData] = useState<{ id: string, name: string, code: string } | null>(null);

    const handleAddCustomField = () => {
        setCustomFields([...customFields, { id: Date.now(), key: '', value: '', type: 'text' }]);
    };

    const handleCustomFieldChange = (id: number, field: 'key' | 'value' | 'type', value: string) => {
        const newCustomFields = customFields.map(cf => {
            if (cf.id === id) {
                return { ...cf, [field]: value };
            }
            return cf;
        });
        setCustomFields(newCustomFields);
    };

    const handleRemoveCustomField = (id: number) => {
        setCustomFields(customFields.filter(cf => cf.id !== id));
    };


    /**
     * Is a uniqueness pre-check worth blocking registration for?
     *
     * `getDocs` needs the server. Offline it rejects with `unavailable`, and
     * treating that as "cannot verify, so refuse" would stop a receptionist
     * registering a walk-in during an outage — the exact case this app's
     * offline-first write path exists to support. So a check that cannot run is
     * skipped with a warning rather than failing the registration: a duplicate
     * hospital number is a merge someone fixes later, a patient turned away at
     * the desk is not recoverable.
     */
    const isDuplicate = async (field: 'hospitalNumber' | 'patientCode', value: string) => {
        if (!firestore || !userProfile?.clinicId || !value) return false;
        try {
            const snap = await getDocs(
                query(
                    collection(firestore, 'patients'),
                    where('clinicId', '==', userProfile.clinicId),
                    where(field, '==', value)
                )
            );
            return !snap.empty;
        } catch (err) {
            console.warn(`Could not check ${field} for duplicates (offline?):`, err);
            return false;
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        if (!firestore || !userProfile?.clinicId) {
            toast({
                title: 'Error!',
                description: 'Cannot identify clinic. Please ensure you are logged in correctly.',
                variant: 'destructive',
            });
            setIsSaving(false);
            return;
        }

        // Everything from here is inside try/finally. Previously an offline
        // `getDocs` rejection escaped the handler, so `setIsSaving(false)` never
        // ran and the button spun forever with no error and no saved patient.
        try {
            const formData = new FormData(event.currentTarget);
            const hospitalNumber = formData.get('hospitalNumber') as string;

            if (await isDuplicate('hospitalNumber', hospitalNumber)) {
                toast({
                    title: 'Duplicate ID!',
                    description: 'A patient with this Hospital Registration Number already exists.',
                    variant: 'destructive',
                });
                return;
            }

            if (await isDuplicate('patientCode', patientCode)) {
                toast({
                    title: 'Duplicate Code!',
                    description: 'This secure linking code is already assigned.',
                    variant: 'destructive',
                });
                return;
            }

            const custom: Record<string, string> = {};
            customFields.forEach(field => {
                if (field.key) {
                    custom[field.key] = field.value;
                }
            });

            /**
             * `createPatient` rather than a bare `addDoc`.
             *
             * `await addDoc(...)` resolves only on *server* acknowledgement — with
             * no network it never settles and never rejects, so the success toast
             * and `setIsSaving(false)` never ran and the record looked lost even
             * though Firestore had queued it. `createPatient` goes through
             * `persistRecord`, which returns as soon as the row is in the local
             * mirror, stamps `updatedAt` for delta sync, and writes the audit
             * event. See the module comment in src/lib/data/base.ts.
             */
            const result = await createPatient(
                firestore,
                {
                    uid: userProfile.uid,
                    name: userProfile.name,
                    email: userProfile.email,
                    role: userProfile.role,
                },
                {
                    clinicId: userProfile.clinicId,
                    patientCode,
                    hospitalNumber,
                    firstName: formData.get('firstName') as string,
                    surname: formData.get('surname') as string,
                    dob: dob?.toISOString() ?? '',
                    sex: formData.get('sex') as any,
                    maritalStatus: formData.get('maritalStatus') as any,
                    address: formData.get('address') as string,
                    phone: formData.get('phone') as string,
                    email: formData.get('email') as string,
                    occupation: formData.get('occupation') as string,
                    origin: formData.get('origin') as string,
                    tribe: formData.get('tribe') as string,
                    religion: formData.get('religion') as string,
                    notes: formData.get('notes') as string,
                    nextOfKin: {
                        name: formData.get('nextOfKinName') as string,
                        relation: formData.get('nextOfKinRelation') as string,
                        phone: formData.get('nextOfKinPhone') as string,
                        address: formData.get('nextOfKinAddress') as string,
                    },
                    custom,
                }
            );

            if (!result.success || !result.id) {
                toast({
                    title: 'Error!',
                    description: result.message || 'Could not save patient record.',
                    variant: 'destructive',
                });
                return;
            }

            setSuccessData({
                id: result.id,
                name: `${formData.get('firstName')} ${formData.get('surname')}`,
                code: patientCode,
            });

            toast({
                title: 'Success!',
                description: result.pending
                    ? `Saved on this device and will sync when you are back online. Code: ${patientCode}`
                    : `Patient created successfully. Unique Code: ${patientCode}`,
            });
        } catch (error: any) {
            console.error("Error adding patient:", error);
            toast({
                title: 'Error!',
                description: 'Could not save patient record. ' + (error?.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Add New Patient</h1>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <Card className="md:col-span-2 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="hospitalNumber" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    Unique Patient Number (MRN) <span className="text-primary">*</span>
                                </Label>
                                <Input id="hospitalNumber" name="hospitalNumber" placeholder="e.g., HN/2024/001" required className="h-11 border-dashed font-bold border-primary/20" />
                                <p className="text-[10px] text-muted-foreground italic">Standard institutional ID used for physical files and billing.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" name="firstName" placeholder="John" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surname">Surname</Label>
                                <Input id="surname" name="surname" placeholder="Doe" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dob && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dob}
                                            onSelect={setDob}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sex">Sex</Label>
                                <Select name="sex">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select sex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maritalStatus">Marital Status</Label>
                                <Select name="maritalStatus">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select marital status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                        <SelectItem value="Divorced">Divorced</SelectItem>
                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="occupation">Occupation</Label>
                                <Input id="occupation" name="occupation" placeholder="e.g., Software Engineer" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="patientCode" className="text-primary font-bold">Unique Patient Code (Linking Code)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="patientCode"
                                        name="patientCode"
                                        value={patientCode}
                                        onChange={(e) => setPatientCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                        placeholder="EX: P-12345"
                                        className="font-mono font-bold border-primary/30 h-12 text-lg"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 border-dashed"
                                        onClick={() => setPatientCode(generatePatientCode())}
                                    >
                                        Auto-Generate
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Enter a manual code or use the auto-generated one. This code allows patients to link their account and see records.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card className="md:col-span-2 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" name="phone" placeholder="+234..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email for Remote Access</Label>
                                <Input id="email" name="email" type="email" placeholder="patient@example.com" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" placeholder="123 Main St, Anytown" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Other Information */}
                    <Card className="md:col-span-2 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg">Other Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="origin">State of Origin</Label>
                                <Input id="origin" name="origin" placeholder="e.g., Lagos" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tribe">Tribe</Label>
                                <Input id="tribe" name="tribe" placeholder="e.g., Yoruba" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="religion">Religion</Label>
                                <Input id="religion" name="religion" placeholder="e.g., Christianity" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">General Notes</Label>
                                <Textarea id="notes" name="notes" placeholder="e.g., Patient has a history of..." className="min-h-[150px]" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next of Kin */}
                    <Card className="md:col-span-2 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg">Next of Kin</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nextOfKinName">Full Name</Label>
                                <Input id="nextOfKinName" name="nextOfKinName" placeholder="Jane Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nextOfKinRelation">Relation</Label>
                                <Input id="nextOfKinRelation" name="nextOfKinRelation" placeholder="Spouse" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nextOfKinPhone">Phone Number</Label>
                                <Input id="nextOfKinPhone" name="nextOfKinPhone" placeholder="+234..." />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="nextOfKinAddress">Address</Label>
                                <Input id="nextOfKinAddress" name="nextOfKinAddress" placeholder="123 Main St, Anytown" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Custom Fields */}
                    <Card className="col-span-1 md:col-span-2 border-dashed">
                        <CardHeader className='flex-row items-center justify-between'>
                            <div className="flex flex-col">
                                <CardTitle className="text-lg">Custom Patient Data</CardTitle>
                                <CardDescription className="text-sm">Add any extra information needed for this patient.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddCustomField}>
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Add Field
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            {customFields.map((field) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start border-t pt-4">
                                    <div className="space-y-2 col-span-12 md:col-span-3">
                                        <Label className="text-xs text-muted-foreground">Field Name</Label>
                                        <Input
                                            placeholder="e.g., Blood Type"
                                            value={field.key}
                                            onChange={(e) => handleCustomFieldChange(field.id, 'key', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-12 md:col-span-9">
                                        <Label className="text-xs text-muted-foreground">Field Value</Label>
                                        {field.type === 'text' ? (
                                            <Input
                                                placeholder="e.g., O+"
                                                value={field.value}
                                                onChange={(e) => handleCustomFieldChange(field.id, 'value', e.target.value)}
                                            />
                                        ) : (
                                            <Textarea
                                                placeholder="Enter details..."
                                                value={field.value}
                                                onChange={(e) => handleCustomFieldChange(field.id, 'value', e.target.value)}
                                                className="min-h-[150px]"
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 justify-self-end col-span-12">
                                        <Select
                                            value={field.type}
                                            onValueChange={(value) => handleCustomFieldChange(field.id, 'type', value)}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="textarea">Text Area</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveCustomField(field.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {customFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No custom fields added.</p>}
                        </CardContent>
                    </Card>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="button-glow">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Patient Record'}
                    </Button>
                </div>
            </form>

            {/* Success Modal for Smooth Transition */}
            <Dialog open={!!successData} onOpenChange={(open) => !open && setSuccessData(null)}>
                <DialogContent className="sm:max-w-md border-dashed">
                    <DialogHeader className="items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-xl">Registration Successful!</DialogTitle>
                        <DialogDescription>
                            The patient record for <span className="font-bold text-foreground">{successData?.name}</span> has been securely created.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-xl border border-dashed border-primary/20 my-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Unique Patient Code</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-black tracking-tighter text-primary font-mono">{successData?.code}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    if (successData) {
                                        navigator.clipboard.writeText(successData.code);
                                        toast({ title: "Copied!", description: "Code copied to clipboard." });
                                    }
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4 text-center max-w-[200px]">
                            Patients use this code to access their documents and view clinic appointments.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        {(userProfile?.role === 'doctor' || userProfile?.role === 'admin') ? (
                            <Button className="w-full button-glow gap-2" size="lg" onClick={() => router.push(`/dashboard/encounters/new?patientId=${successData?.id}`)}>
                                <Stethoscope className="h-4 w-4" />
                                Start Clinical SOAP Record
                            </Button>
                        ) : (
                            <Button className="w-full button-glow gap-2" size="lg" onClick={() => router.push(`/dashboard/appointments/new?patientId=${successData?.id}`)}>
                                <CalendarIcon className="h-4 w-4" />
                                Schedule Appointment
                            </Button>
                        )}
                        <Button variant="ghost" className="w-full text-xs" onClick={() => router.push(`/dashboard/patients/detail?id=${successData?.id}`)}>
                            View Full Patient Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
