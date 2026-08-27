'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Patient, UserProfile, Clinic, Encounter } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Copy, Plus, Trash2, ArrowLeft, Shield, User as UserIcon, Pill, Stethoscope, FileText, Activity, Droplets, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { updatePatient } from '@/lib/data/patients';
import { saveEncounter } from '@/lib/data/encounters';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalLetterhead } from '@/components/medical/letterhead';
import { TwinVisualizer } from '@/components/dashboard/TwinVisualizer';
import { WhatIfCoach } from '@/components/dashboard/WhatIfCoach';
import { DrugSafetyChecker } from '@/components/dashboard/DrugSafetyChecker';
import { LabReportExplainer } from '@/components/dashboard/LabReportExplainer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function SubmitButton({ pending }: { pending: boolean }) {
    return (
        <Button type="submit" disabled={pending} className="button-glow font-bold uppercase tracking-wider text-xs px-6 py-5">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Saving Changes...' : 'Save Changes'}
        </Button>
    );
}

interface EditPatientFormProps {
    patient: Patient;
    clinic: Clinic | null | undefined;
    actor: UserProfile;
}

function EditPatientForm({ patient, clinic, actor }: EditPatientFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [saving, setSaving] = useState(false);
    const [dob, setDob] = useState<Date | undefined>(patient.dob ? new Date(patient.dob) : undefined);
    const [currentCode, setCurrentCode] = useState(patient.patientCode || '');

    const [allergies, setAllergies] = useState<any[]>(patient.allergies || [
        { name: 'Bee Stings', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Dogs/pets', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Peanuts', severity: 'Severe', reaction: 'Anaphylactic Shock' },
        { name: 'Penicillin', severity: 'Moderate to severe', reaction: 'Shortness of breath' },
        { name: 'Codeine', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Latex', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Shellfish', severity: 'Moderate', reaction: 'Hives' },
        { name: 'Soy', severity: 'Moderate', reaction: 'Hives' }
    ]);
    const [immunizations, setImmunizations] = useState<any[]>(patient.immunizations || [
        { name: 'Influenza Virus Vaccine', due: 'Dec 2026', type: 'Intramuscular injection', value: '50 / mcg', instructions: 'Possible flu-like symptoms for 3 days' },
        { name: 'Tetanus and Diphtheria Toxoids', due: 'Jan 2027', type: 'Intramuscular injection', value: '50 / mcg', instructions: 'Mild pain or soreness in the local area' }
    ]);
    const [planOfCare, setPlanOfCare] = useState<any[]>(patient.planOfCare || [
        { name: 'Office consultation', date: '1 DEC 2026', instructions: 'General follow-up evaluation' },
        { name: 'Chest X-ray', date: '15 DEC 2026', instructions: 'Standard screening' },
        { name: 'Sputum Culture', date: '8 JAN 2027', instructions: 'Lab work check' }
    ]);

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

    const handleAllergyChange = (index: number, key: string, val: string) => {
        const updated = [...allergies];
        updated[index][key] = val;
        setAllergies(updated);
    };

    const addAllergy = () => {
        setAllergies([...allergies, { name: '', severity: '', reaction: '' }]);
    };

    const removeAllergy = (index: number) => {
        setAllergies(allergies.filter((_, i) => i !== index));
    };

    const handleImmunizationChange = (index: number, key: string, val: string) => {
        const updated = [...immunizations];
        updated[index][key] = val;
        setImmunizations(updated);
    };

    const addImmunization = () => {
        setImmunizations([...immunizations, { name: '', due: '', type: '', value: '', instructions: '' }]);
    };

    const removeImmunization = (index: number) => {
        setImmunizations(immunizations.filter((_, i) => i !== index));
    };

    const handlePlanChange = (index: number, key: string, val: string) => {
        const updated = [...planOfCare];
        updated[index][key] = val;
        setPlanOfCare(updated);
    };

    const addPlan = () => {
        setPlanOfCare([...planOfCare, { name: '', date: '', instructions: '' }]);
    };

    const removePlan = (index: number) => {
        setPlanOfCare(planOfCare.filter((_, i) => i !== index));
    };

    /**
     * Saves demographics straight to Firestore from the client, so a records
     * clerk can correct a chart during an outage. `updatePatient` merges rather
     * than replaces, so fields this form does not carry (`lastVisit`, and any
     * custom field a clinic added) survive the edit.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !actor) return;

        const data = new FormData(e.currentTarget);
        const str = (k: string) => String(data.get(k) ?? '');

        setSaving(true);
        const result = await updatePatient(
            firestore,
            actor,
            patient.id,
            {
                clinicId: patient.clinicId,
                firstName: str('firstName'),
                surname: str('surname'),
                dob: dob ? dob.toISOString() : patient.dob,
                sex: (str('sex') || patient.sex) as Patient['sex'],
                maritalStatus: (str('maritalStatus') || patient.maritalStatus) as Patient['maritalStatus'],
                address: str('address'),
                phone: str('phone'),
                email: str('email'),
                occupation: str('occupation'),
                origin: str('origin'),
                tribe: str('tribe'),
                religion: str('religion'),
                notes: str('notes'),
                patientCode: currentCode,
                nextOfKin: {
                    name: str('nextOfKinName'),
                    relation: str('nextOfKinRelation'),
                    phone: str('nextOfKinPhone'),
                    address: str('nextOfKinAddress'),
                },
                allergies,
                immunizations,
                planOfCare,
            },
            // Passed so the audit log can record what actually changed — the
            // write below is about to overwrite the only other copy.
            { previous: patient }
        );
        setSaving(false);

        toast({
            title: result.success ? 'Success!' : 'Error!',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });

        if (result.success) {
            router.push(`/dashboard/patients/detail?id=${patient.id}`);
        }
    };

    const formattedIssuedDate = patient.registrationDate ? format(new Date(patient.registrationDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">

            {/* Editable Health Record Sheet container designed to match detail page */}
            <div className="bg-white dark:bg-zinc-950 text-black dark:text-zinc-50 font-dm-sans w-full p-8 sm:p-12 shadow-sm rounded-lg relative border border-zinc-200 dark:border-zinc-800">
                
                {/* Hospital Letterhead */}
                <MedicalLetterhead clinicName={clinic?.name} clinicAddress={clinic?.address} clinicPhone={clinic?.phone} clinicEmail={clinic?.email} className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6" />

                {/* Top Header */}
                <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-zinc-50 font-headline uppercase font-dm-sans">Edit Medical Health Record</h1>
                        <p className="text-[10px] text-gray-555 dark:text-zinc-400 font-mono tracking-wider font-dm-sans">ORELIS CLINICAL EDITOR MODE</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-555 uppercase tracking-widest leading-none font-dm-sans">Issued Date</p>
                        <p className="text-sm font-bold text-black dark:text-zinc-50 mt-1 font-dm-sans">{formattedIssuedDate}</p>
                    </div>
                </div>

                {/* Main Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-black dark:text-zinc-200">
                    
                    {/* Left Profile Column */}
                    <div className="md:col-span-4 border-r border-gray-200 dark:border-zinc-800 pr-6 space-y-6">
                        <div>
                            <p className="text-xs font-bold text-zinc-955 dark:text-zinc-100 font-dm-sans mb-3 uppercase tracking-wider">Patient Profile</p>
                            
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">SURNAME</Label>
                                    <Input name="surname" defaultValue={patient.surname} className="h-9 text-sm font-bold mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                                </div>
                                <div>
                                    <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">FIRST NAME</Label>
                                    <Input name="firstName" defaultValue={patient.firstName} className="h-9 text-sm font-bold mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                                </div>
                            </div>
                            
                            {/* Profile Photo Frame */}
                            <div className="w-32 h-36 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 flex items-center justify-center my-4 overflow-hidden relative group">
                                <UserIcon className="w-16 h-16 text-gray-300 dark:text-zinc-650" />
                                {patient.photoUrl && (
                                    <img src={patient.photoUrl} alt="Patient Portrait" className="w-full h-full object-cover absolute inset-0" />
                                )}
                            </div>
                        </div>

                        {/* Profile Fields */}
                        <div className="space-y-4 text-xs">
                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">DATE OF BIRTH</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800", !dob && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                            {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dob} onSelect={setDob} initialFocus /></PopoverContent>
                                </Popover>
                                <input type="hidden" name="dob" value={dob?.toISOString()} />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">GENDER</Label>
                                <Select name="sex" defaultValue={patient.sex}>
                                    <SelectTrigger className="h-9 text-xs mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">MARITAL STATUS</Label>
                                <Select name="maritalStatus" defaultValue={patient.maritalStatus}>
                                    <SelectTrigger className="h-9 text-xs mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                        <SelectItem value="Divorced">Divorced</SelectItem>
                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">PHONE</Label>
                                <Input name="phone" defaultValue={patient.phone} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">EMAIL ADDRESS</Label>
                                <Input name="email" type="email" defaultValue={patient.email} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">ADDRESS</Label>
                                <Textarea name="address" defaultValue={patient.address} className="min-h-[60px] mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">ETHNICITY</Label>
                                <Input name="origin" defaultValue={patient.origin} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="State of Origin" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">LANGUAGE SPOKEN / TRIBE</Label>
                                <Input name="tribe" defaultValue={patient.tribe} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="Language / Tribe" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">RELIGION</Label>
                                <Input name="religion" defaultValue={patient.religion} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="Religion" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-555 tracking-widest">OCCUPATION</Label>
                                <Input name="occupation" defaultValue={patient.occupation} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="Occupation" />
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-zinc-850" />

                        {/* Guardian / Next of Kin */}
                        <div className="space-y-3 text-xs">
                            <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-wider">GUARDIAN / NEXT OF KIN</p>
                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">FULL NAME</Label>
                                <Input name="nextOfKinName" defaultValue={patient.nextOfKin?.name} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850" />
                            </div>
                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">RELATION</Label>
                                <Input name="nextOfKinRelation" defaultValue={patient.nextOfKin?.relation} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850" />
                            </div>
                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">PHONE</Label>
                                <Input name="nextOfKinPhone" defaultValue={patient.nextOfKin?.phone} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850" />
                            </div>
                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">ADDRESS</Label>
                                <Input name="nextOfKinAddress" defaultValue={patient.nextOfKin?.address} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850" />
                            </div>
                        </div>
                    </div>

                    {/* Right Notes & Medical Tables Column */}
                    <div className="md:col-span-8 pl-0 md:pl-4 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-850 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 border-2 border-black dark:border-zinc-200 flex items-center justify-center font-bold text-black dark:text-zinc-50 text-sm select-none">✓</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-black dark:text-zinc-50 leading-none">Allergies</h3>
                                        <p className="text-[11px] text-gray-555 dark:text-zinc-400 italic mt-0.5">Manage known allergies below.</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addAllergy} className="gap-1 h-8 text-[11px] border-dashed">
                                    <Plus className="h-3.5 w-3.5" /> Add Row
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                {allergies.map((allergy, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-900/30 p-2 border border-dashed rounded-lg">
                                        <Input value={allergy.name || ''} onChange={e => handleAllergyChange(idx, 'name', e.target.value)} placeholder="Allergen (e.g. Peanuts)" className="h-8 text-xs bg-background" />
                                        <Input value={allergy.severity || ''} onChange={e => handleAllergyChange(idx, 'severity', e.target.value)} placeholder="Severity (e.g. Severe)" className="h-8 text-xs bg-background w-24" />
                                        <Input value={allergy.reaction || ''} onChange={e => handleAllergyChange(idx, 'reaction', e.target.value)} placeholder="Reaction (e.g. Shock)" className="h-8 text-xs bg-background" />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAllergy(idx)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {allergies.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4 bg-zinc-50 dark:bg-zinc-900/30 rounded border border-dashed">No allergies recorded.</p>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-zinc-850" />

                        {/* Immunizations Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-850 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-black dark:bg-zinc-800 flex items-center justify-center text-white dark:text-zinc-100 text-xs">
                                        <Pill className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-black dark:text-zinc-50 leading-none">Immunizations</h3>
                                        <p className="text-[11px] text-gray-555 dark:text-zinc-400 italic mt-0.5">Manage vaccines and interval schedules.</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addImmunization} className="gap-1 h-8 text-[11px] border-dashed">
                                    <Plus className="h-3.5 w-3.5" /> Add Immunization
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {immunizations.map((imm, idx) => (
                                    <div key={idx} className="border border-dashed border-gray-300 dark:border-zinc-700 p-4 rounded bg-gray-50/50 dark:bg-zinc-900/30 relative space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                                                <div>
                                                    <Label className="text-[9px] font-bold text-gray-400">VACCINE NAME</Label>
                                                    <Input value={imm.name || ''} onChange={e => handleImmunizationChange(idx, 'name', e.target.value)} placeholder="Influenza Vaccine" className="h-8 text-xs bg-background mt-1" />
                                                </div>
                                                <div>
                                                    <Label className="text-[9px] font-bold text-gray-400">DUE BY</Label>
                                                    <Input value={imm.due || ''} onChange={e => handleImmunizationChange(idx, 'due', e.target.value)} placeholder="Dec 2026" className="h-8 text-xs bg-background mt-1" />
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeImmunization(idx)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>
                                                <Label className="text-[9px] font-bold text-gray-400">TYPE / ROUTE</Label>
                                                <Input value={imm.type || ''} onChange={e => handleImmunizationChange(idx, 'type', e.target.value)} placeholder="Intramuscular" className="h-8 text-xs bg-background mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-[9px] font-bold text-gray-400">VALUE / DOSE</Label>
                                                <Input value={imm.value || ''} onChange={e => handleImmunizationChange(idx, 'value', e.target.value)} placeholder="50 mcg" className="h-8 text-xs bg-background mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-[9px] font-bold text-gray-400">INSTRUCTIONS</Label>
                                                <Input value={imm.instructions || ''} onChange={e => handleImmunizationChange(idx, 'instructions', e.target.value)} placeholder="Possible local soreness" className="h-8 text-xs bg-background mt-1" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {immunizations.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-6 bg-zinc-50 dark:bg-zinc-900/30 rounded border border-dashed">No immunizations recorded.</p>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-zinc-850" />

                        {/* Plan of Care Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-850 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gray-100 dark:bg-zinc-900 border border-black dark:border-zinc-700 flex items-center justify-center">
                                        <CalendarIcon className="w-3.5 h-3.5 text-black dark:text-zinc-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-black dark:text-zinc-50 leading-none">Plan of Care</h3>
                                        <p className="text-[11px] text-gray-555 dark:text-zinc-400 italic mt-0.5">Edit patient healthcare recommendations.</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addPlan} className="gap-1 h-8 text-[11px] border-dashed">
                                    <Plus className="h-3.5 w-3.5" /> Add Task
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {planOfCare.map((plan, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-900/30 p-2 border border-dashed rounded-lg">
                                        <Input value={plan.name || ''} onChange={e => handlePlanChange(idx, 'name', e.target.value)} placeholder="Task (e.g. Chest X-Ray)" className="h-8 text-xs bg-background" />
                                        <Input value={plan.date || ''} onChange={e => handlePlanChange(idx, 'date', e.target.value)} placeholder="Target Date" className="h-8 text-xs bg-background w-32" />
                                        <Input value={plan.instructions || ''} onChange={e => handlePlanChange(idx, 'instructions', e.target.value)} placeholder="Clinical instructions" className="h-8 text-xs bg-background" />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePlan(idx)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {planOfCare.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4 bg-zinc-50 dark:bg-zinc-900/30 rounded border border-dashed">No care plans recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doctor's Notes Section */}
                <hr className="border-gray-200 dark:border-zinc-800 my-6" />
                <div className="space-y-3 text-black dark:text-zinc-250">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-black dark:bg-zinc-800 flex items-center justify-center text-white dark:text-zinc-100 text-xs font-bold font-mono">N</div>
                        <div>
                            <h3 className="text-lg font-bold text-black dark:text-zinc-50 leading-none">Clinical History / Doctor's Notes</h3>
                            <p className="text-[11px] text-gray-555 dark:text-zinc-400 italic mt-0.5">Handwritten clinical history notes and patient files.</p>
                        </div>
                    </div>
                    <Textarea 
                        id="notes" 
                        name="notes" 
                        defaultValue={patient.notes} 
                        className="min-h-[150px] border border-dashed border-gray-300 dark:border-zinc-700 p-4 rounded bg-gray-50/50 dark:bg-zinc-900/30 text-xs text-gray-800 dark:text-zinc-300 leading-relaxed font-dm-sans" 
                        placeholder="Write clinical patient history notes..."
                    />
                </div>

                {/* Bottom Footer info */}
                <div className="flex justify-between items-center border-t border-gray-200 dark:border-zinc-800 mt-12 pt-4 text-[9px] font-mono text-gray-400 dark:text-zinc-550 uppercase tracking-wider">
                    <span>EDIT MODE • MEDICAL HEALTH RECORD</span>
                    <span>SYSTEM PORTAL</span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" type="button" onClick={() => router.back()} className="h-10 px-6 font-bold uppercase tracking-wider text-xs border-dashed">Cancel</Button>
                <SubmitButton pending={saving} />
            </div>
        </form>
    );
}

interface EditEncounterFormProps {
    encounter: Encounter;
    patient: Patient;
    clinic: Clinic | null | undefined;
    actor: UserProfile;
}

function EditEncounterForm({ encounter, patient, clinic, actor }: EditEncounterFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [saving, setSaving] = useState(false);
    
    // States for Vitals
    const [bpSys, setBpSys] = useState(encounter.vitals?.find(v => v.type === 'blood_pressure')?.value?.split('/')?.[0] || '');
    const [bpDia, setBpDia] = useState(encounter.vitals?.find(v => v.type === 'blood_pressure')?.value?.split('/')?.[1] || '');
    const [hr, setHr] = useState(encounter.vitals?.find(v => v.type === 'heart_rate')?.value || '');
    const [temp, setTemp] = useState(encounter.vitals?.find(v => v.type === 'temperature')?.value || '');
    // Both spellings, because both exist in stored encounters (see `Observation`
    // in src/lib/types.ts). Matching only one meant an encounter whose oxygen
    // saturation was recorded under the other name loaded with a blank field —
    // and the save below rebuilds `vitals` from these states, so the reading was
    // then dropped from the record entirely.
    const [spo2, setSpo2] = useState(
        encounter.vitals?.find(v => v.type === 'spo2' || v.type === 'oxygen_saturation')?.value || ''
    );

    // State for prescriptions
    const [prescriptions, setPrescriptions] = useState<string[]>(encounter.prescriptions || []);
    const [prescriptionInput, setPrescriptionInput] = useState("");

    const addPrescription = () => {
        if (!prescriptionInput.trim() || prescriptions.includes(prescriptionInput.trim())) return;
        setPrescriptions([...prescriptions, prescriptionInput.trim()]);
        setPrescriptionInput("");
    };

    const removePrescription = (idx: number) => {
        setPrescriptions(prescriptions.filter((_, i) => i !== idx));
    };

    // Build vitals array to serialize
    const vitalsList = [
        { id: 'v1', type: 'temperature', value: temp, unit: '°C', timestamp: new Date().toISOString() },
        { id: 'v2', type: 'blood_pressure', value: bpSys && bpDia ? `${bpSys}/${bpDia}` : '', unit: 'mmHg', timestamp: new Date().toISOString() },
        { id: 'v3', type: 'heart_rate', value: hr, unit: 'bpm', timestamp: new Date().toISOString() },
        ...(spo2 ? [{ id: 'v4', type: 'spo2', value: spo2, unit: '%', timestamp: new Date().toISOString() }] : [])
    ].filter(v => v.value);

    /**
     * Editing an encounter that is already `Finalized` is an **amendment**, not
     * an edit — `saveEncounter` records it as `encounter.amend` and captures the
     * original author and timestamp, because this write is about to overwrite the
     * only other record of what the note used to say.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !actor) return;

        const data = new FormData(e.currentTarget);
        const str = (k: string) => String(data.get(k) ?? '');

        setSaving(true);
        const result = await saveEncounter(
            firestore,
            actor,
            {
                id: encounter.id,
                clinicId: patient.clinicId,
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.surname}`,
                doctorId: encounter.doctorId,
                doctorName: encounter.doctorName,
                date: encounter.date,
                type: (str('type') || encounter.type) as Encounter['type'],
                diagnosis: str('diagnosis'),
                soap: {
                    subjective: str('subjective'),
                    objective: str('objective'),
                    assessment: str('assessment'),
                    plan: str('plan'),
                },
                vitals: vitalsList as any,
                status: (str('status') || encounter.status) as Encounter['status'],
                prescriptions,
                labOrders: encounter.labOrders ?? [],
            },
            { previous: encounter }
        );
        setSaving(false);

        toast({
            title: result.success ? 'Success!' : 'Error!',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });

        if (result.success) router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">

            {/* Editable Encounter Sheet container designed to match detail page */}
            <div className="bg-white dark:bg-zinc-950 text-black dark:text-zinc-50 font-dm-sans w-full p-8 sm:p-12 shadow-sm rounded-lg relative border border-zinc-200 dark:border-zinc-800">
                
                {/* Hospital Letterhead */}
                <MedicalLetterhead clinicName={clinic?.name} clinicAddress={clinic?.address} clinicPhone={clinic?.phone} clinicEmail={clinic?.email} className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6" />

                {/* Top Header */}
                <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-zinc-50 font-headline uppercase font-dm-sans">Edit {encounter.type} Encounter</h1>
                        <p className="text-[10px] text-gray-555 dark:text-zinc-400 font-mono tracking-wider font-dm-sans">ORELIS CLINICAL ENCOUNTER EDITOR</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-555 uppercase tracking-widest leading-none font-dm-sans">DATE</p>
                        <p className="text-sm font-bold text-black dark:text-zinc-50 mt-1 font-dm-sans">{format(new Date(encounter.date), 'dd MMM yyyy')}</p>
                    </div>
                </div>

                {/* Grid for main metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-black dark:text-zinc-255">
                    <div>
                        <Label className="text-xs font-bold text-zinc-955 dark:text-zinc-100 font-dm-sans">Attending Doctor</Label>
                        <Input disabled value={encounter.doctorName} className="h-9 mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800" />
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-zinc-955 dark:text-zinc-100 font-dm-sans">Encounter Type</Label>
                        <Select name="type" defaultValue={encounter.type}>
                            <SelectTrigger className="h-9 mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Consultation">Consultation</SelectItem>
                                <SelectItem value="Follow-up">Follow-up</SelectItem>
                                <SelectItem value="Emergency">Emergency</SelectItem>
                                <SelectItem value="Routine">Routine</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-zinc-955 dark:text-zinc-100 font-dm-sans">Status</Label>
                        <Select name="status" defaultValue={encounter.status}>
                            <SelectTrigger className="h-9 mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Finalized">Finalized</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Vitals Form Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 rounded border border-dashed border-zinc-200 dark:border-zinc-850">
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-955 dark:text-zinc-100 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperature (°C)</Label>
                        <Input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} placeholder="36.5" className="h-8 text-xs bg-background mt-1" />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-955 dark:text-zinc-100 flex items-center gap-1"><Activity className="h-3 w-3" /> Blood Pressure (Sys/Dia)</Label>
                        <div className="flex items-center gap-1 mt-1">
                            <Input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)} placeholder="120" className="h-8 text-xs bg-background" />
                            <span>/</span>
                            <Input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)} placeholder="80" className="h-8 text-xs bg-background" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-955 dark:text-zinc-100 flex items-center gap-1"><Activity className="h-3 w-3" /> Heart Rate (bpm)</Label>
                        <Input type="number" value={hr} onChange={e => setHr(e.target.value)} placeholder="72" className="h-8 text-xs bg-background mt-1" />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-955 dark:text-zinc-100 flex items-center gap-1"><Droplets className="h-3 w-3" /> SpO2 (%)</Label>
                        <Input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="98" className="h-8 text-xs bg-background mt-1" />
                    </div>
                </div>

                {/* SOAP Form Sections */}
                <div className="space-y-6">
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 border-b border-dashed pb-1 block">(S) Subjective findings</Label>
                        <Textarea name="subjective" defaultValue={encounter.soap.subjective} className="min-h-[100px] text-xs mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 text-gray-800 dark:text-zinc-300" placeholder="Patient complaints, symptoms..." />
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-dashed pb-1 block">(O) Objective findings</Label>
                        <Textarea name="objective" defaultValue={encounter.soap.objective} className="min-h-[100px] text-xs mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 text-gray-800 dark:text-zinc-300" placeholder="Physical examination, clinical signs..." />
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-550 mb-2 border-b border-dashed pb-1 block">(A) Assessment & Diagnosis</Label>
                        <Textarea name="assessment" defaultValue={encounter.soap.assessment} className="min-h-[80px] text-xs mt-1 font-bold bg-zinc-50/50 dark:bg-zinc-900/30 text-black dark:text-zinc-200" placeholder="Diagnosis, assessments..." />
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2 border-b border-dashed pb-1 block">(P) Management Plan</Label>
                        <Textarea name="plan" defaultValue={encounter.soap.plan} className="min-h-[100px] text-xs mt-1 bg-zinc-50/50 dark:bg-zinc-900/30 text-gray-800 dark:text-zinc-300" placeholder="Treatment strategy, recommendations..." />
                    </div>
                </div>

                {/* Prescriptions Form Section */}
                <div className="mt-8 bg-primary/5 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5 text-primary" /> Authorized Prescriptions (Rₓ)
                    </h4>
                    <div className="flex gap-2 mb-4">
                        <Input className="h-9 bg-background text-xs" placeholder="Add medication (dosage, frequency)..." value={prescriptionInput} onChange={e => setPrescriptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPrescription())} />
                        <Button type="button" size="sm" onClick={addPrescription} className="h-9">Add Script</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prescriptions.map((p, i) => (
                            <div key={i} className="bg-background border border-zinc-200 dark:border-zinc-800 p-2 px-3 rounded flex items-center justify-between group text-xs font-semibold">
                                <span className="truncate pr-4">{p}</span>
                                <button type="button" onClick={() => removePrescription(i)} className="text-destructive opacity-45 hover:opacity-100">×</button>
                            </div>
                        ))}
                        {prescriptions.length === 0 && (
                            <p className="text-xs text-muted-foreground italic col-span-2 text-center py-2">No prescriptions authorized.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" type="button" onClick={() => router.back()} className="h-10 px-6 font-bold uppercase tracking-wider text-xs border-dashed">Cancel</Button>
                <SubmitButton pending={saving} />
            </div>
        </form>
    );
}

/**
 * Reached as `/dashboard/patients/edit?id=<patientId>`.
 *
 * The route used to be `/dashboard/patients/[id]/edit`. A Next.js static export —
 * which is what the Tauri desktop and mobile builds are — has to enumerate every
 * dynamic segment at build time via `generateStaticParams`, and patient ids are
 * by definition not knowable then. A search param carries the same information
 * with no build-time enumeration.
 */
function EditPatientPageInner() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get('id') ?? '';
    const firestore = useFirestore();
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);

    const patientDocRef = useMemo(() => {
        if (!patientId || !firestore) return null;
        return doc(firestore, 'patients', patientId);
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

    if (patientLoading) {
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

    // Both forms write an audit entry naming the actor and their role at the
    // time, so neither renders until the profile that supplies it has loaded.
    if (!userProfile) {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <div className="flex flex-col gap-6 noisy-bg pb-20">
            {/* Header controls */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="font-semibold text-lg md:text-2xl">
                    {currentPage === 1 
                        ? `Edit Patient: ${patient.firstName} ${patient.surname}`
                        : `Edit Encounter: ${encounters?.[currentPage - 2]?.type}`
                    }
                </h1>
            </div>

            {/* Main edit form matching detail sheet */}
            {currentPage === 1 ? (
                <EditPatientForm patient={patient} clinic={clinic} actor={userProfile} />
            ) : (
                (() => {
                    const enc = encounters?.[currentPage - 2];
                    if (!enc) return null;
                    return <EditEncounterForm encounter={enc} patient={patient} clinic={clinic} actor={userProfile} />;
                })()
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-955 p-4 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800 print:hidden">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Previous Page
                </Button>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-dm-sans">
                    Page {currentPage} of {1 + (encounters?.length || 0)}
                </span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, 1 + (encounters?.length || 0)))}
                    disabled={currentPage === 1 + (encounters?.length || 0)}
                >
                    Next Page
                </Button>
            </div>

            {/* Dashboard Telemetry, AI Utilities and HOLON Checkers as requested */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b border-dashed">
                            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Twin Telemetry</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <TwinVisualizer patientId={patient.id} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <WhatIfCoach />

                    {/* HOLON Drug Safety and Clinical Translator */}
                    <div className="grid grid-cols-1 gap-6">
                        <DrugSafetyChecker />
                        <LabReportExplainer />
                    </div>

                    {/* Interactive Encounter Log for Doctors (Past consultation notes) */}
                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b border-dashed">
                            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                <span>Clinical Encounter History</span>
                                <Badge variant="outline">{encounters?.length || 0} Encounters</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {encounters && encounters.length > 0 ? encounters.map((enc) => (
                                <div key={enc.id} className="p-2.5 rounded-xl border border-dashed border-border hover:border-primary/45 transition-colors group text-black dark:text-white">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <div className="font-bold text-sm uppercase flex items-center gap-2">
                                                {enc.type} Encounter
                                                <Badge variant={enc.status === 'Finalized' ? 'outline' : 'secondary'} className="text-[9px] py-0 px-1">
                                                    {enc.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{format(new Date(enc.date), 'PPP')}</p>
                                        </div>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold gap-1 text-primary hover:bg-primary/5">
                                                    <FileText className="h-3 w-3" /> View Details
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden border-dashed bg-white dark:bg-zinc-950 text-black dark:text-white">
                                                <DialogHeader className="p-6 bg-primary/5 border-b border-dashed">
                                                    <DialogTitle className="flex items-center gap-2 text-black dark:text-white">
                                                        <Stethoscope className="h-5 w-5 text-primary" />
                                                        Clinical Encounter Detail
                                                    </DialogTitle>
                                                    <DialogDescription className="font-mono text-[10px] uppercase text-muted-foreground">
                                                        Ref: {enc.id} • {format(new Date(enc.date), 'PPP p')}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <ScrollArea className="p-6 max-h-[60vh]">
                                                    <div className="space-y-8 pb-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                            {enc.vitals?.map(v => (
                                                                <div key={v.id} className="p-3 rounded-lg border border-dashed bg-muted/30">
                                                                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{v.type.replace('_', ' ')}</p>
                                                                    <p className="text-sm font-bold text-black dark:text-white">{v.value} <span className="text-[10px] opacity-60">{v.unit}</span></p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="space-y-6">
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 border-b border-dashed pb-1">(S) Subjective</h4>
                                                                <p className="text-sm italic leading-relaxed text-muted-foreground whitespace-pre-wrap">{enc.soap.subjective || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-dashed pb-1">(O) Objective</h4>
                                                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{enc.soap.objective || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 border-b border-dashed pb-1">(A) Assessment</h4>
                                                                <p className="text-sm font-bold leading-relaxed text-black dark:text-white whitespace-pre-wrap">{enc.soap.assessment || 'N/A'}</p>
                                                            </section>
                                                            <section>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2 border-b border-dashed pb-1">(P) Plan</h4>
                                                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{enc.soap.plan || 'N/A'}</p>
                                                            </section>
                                                        </div>

                                                        {enc.prescriptions && enc.prescriptions.length > 0 && (
                                                            <section className="p-4 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <Pill className="h-3 w-3 text-primary" /> Authorized Meds
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {enc.prescriptions.map((p, i) => (
                                                                        <div key={i} className="text-xs font-bold p-2 bg-background rounded border border-dashed flex items-center gap-2 text-black dark:text-white">
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
                                    <div className="grid grid-cols-4 gap-1.5 py-1">
                                        {enc.vitals?.slice(0, 4).map(v => (
                                            <div key={v.id} className="text-center p-0.5 bg-muted/40 rounded">
                                                <p className="text-[7.5px] uppercase text-muted-foreground">{v.type.split('_')[0]}</p>
                                                <p className="text-[9.5px] font-bold">{v.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic mt-1 border-l-2 border-border pl-2">
                                        {enc.soap.assessment}
                                    </p>
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

/**
 * `useSearchParams` suspends during prerender, so a static export requires the
 * boundary — without it the build fails with "useSearchParams() should be
 * wrapped in a suspense boundary".
 */
export default function EditPatientPage() {
    return (
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <EditPatientPageInner />
        </Suspense>
    );
}
