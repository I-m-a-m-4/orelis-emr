'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Patient, UserProfile, Clinic } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Copy, Plus, Trash2, ArrowLeft, Shield, User as UserIcon, Pill, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { updatePatientAction } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalLetterhead } from '@/components/medical/letterhead';
import { TwinVisualizer } from '@/components/dashboard/TwinVisualizer';
import { WhatIfCoach } from '@/components/dashboard/WhatIfCoach';
import { DrugSafetyChecker } from '@/components/dashboard/DrugSafetyChecker';
import { LabReportExplainer } from '@/components/dashboard/LabReportExplainer';

function SubmitButton() {
    const { pending } = useFormStatus();
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
}

function EditPatientForm({ patient, clinic }: EditPatientFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [state, formAction] = useActionState(updatePatientAction, { isSuccess: false, message: '', errors: undefined });
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

    const formattedIssuedDate = patient.registrationDate ? format(new Date(patient.registrationDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

    return (
        <form action={formAction} className="flex flex-col gap-6 w-full">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="clinicId" value={patient.clinicId} />
            <input type="hidden" name="allergiesJson" value={JSON.stringify(allergies)} />
            <input type="hidden" name="immunizationsJson" value={JSON.stringify(immunizations)} />
            <input type="hidden" name="planOfCareJson" value={JSON.stringify(planOfCare)} />

            {/* Editable Health Record Sheet container designed to match detail page */}
            <div className="bg-white dark:bg-zinc-955 text-black dark:text-zinc-50 font-dm-sans w-full p-8 sm:p-12 shadow-sm rounded-lg relative border border-zinc-200 dark:border-zinc-800">
                
                {/* Hospital Letterhead */}
                <MedicalLetterhead clinicName={clinic?.name} clinicAddress={clinic?.address} clinicPhone={clinic?.phone} clinicEmail={clinic?.email} className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6" />

                {/* Top Header */}
                <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-zinc-50 font-headline uppercase font-dm-sans">Edit Medical Health Record</h1>
                        <p className="text-[10px] text-gray-550 dark:text-zinc-400 font-mono tracking-wider font-dm-sans">ORELIS CLINICAL EDITOR MODE</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-widest leading-none font-dm-sans">Issued Date</p>
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
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">GENDER</Label>
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
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">MARITAL STATUS</Label>
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
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">PHONE</Label>
                                <Input name="phone" defaultValue={patient.phone} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">EMAIL ADDRESS</Label>
                                <Input name="email" type="email" defaultValue={patient.email} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">ADDRESS</Label>
                                <Textarea name="address" defaultValue={patient.address} className="min-h-[60px] mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">ETHNICITY</Label>
                                <Input name="origin" defaultValue={patient.origin} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="State of Origin" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">LANGUAGE SPOKEN / TRIBE</Label>
                                <Input name="tribe" defaultValue={patient.tribe} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="Language / Tribe" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">RELIGION</Label>
                                <Input name="religion" defaultValue={patient.religion} className="h-9 mt-1 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="Religion" />
                            </div>

                            <div>
                                <Label className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-widest">OCCUPATION</Label>
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
                            <p className="text-[11px] text-gray-550 dark:text-zinc-400 italic mt-0.5">Handwritten clinical history notes and patient files.</p>
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
                <SubmitButton />
            </div>
        </form>
    );
}


export default function EditPatientPage() {
    const { id: patientId } = useParams();
    const firestore = useFirestore();
    const router = useRouter();

    const patientDocRef = useMemo(() => {
        if (!patientId || !firestore) return null;
        return doc(firestore, 'patients', Array.isArray(patientId) ? patientId[0] : patientId);
    }, [patientId, firestore]);

    const { data: patient, loading: patientLoading } = useDoc<Patient>(patientDocRef);

    const clinicRef = useMemo(() => {
        if (!patient?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', patient.clinicId);
    }, [patient, firestore]);
    const { data: clinic } = useDoc<Clinic>(clinicRef);

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

    return (
        <div className="flex flex-col gap-6 noisy-bg pb-20">
            {/* Header controls */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="font-semibold text-lg md:text-2xl">Edit Patient: {patient.firstName} {patient.surname}</h1>
            </div>

            {/* Main edit form matching detail sheet */}
            <EditPatientForm patient={patient} clinic={clinic} />

            {/* Dashboard Telemetry, AI Utilities and HOLON Checkers as requested */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b border-dashed">
                            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Ontomorph Twin Telemetry</CardTitle>
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
                </div>
            </div>
        </div>
    );
}
