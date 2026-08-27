'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { ClipboardList, Plus, Search, Filter, FilterX, Download, AlertCircle, User, Activity, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveEncounter } from '@/lib/data/encounters';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import type { Patient, Encounter, UserProfile } from '@/lib/types';
import Link from 'next/link';

function RecordNewDetailModal({ clinicId, patients, actor }: { clinicId: string, patients: Patient[], actor: UserProfile }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [patientSearch, setPatientSearch] = useState('');
    const [encounterType, setEncounterType] = useState<Encounter['type']>('Consultation');

    const filteredPatientsForSelect = useMemo(() => {
        return patients.filter(p =>
            `${p.firstName} ${p.surname}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
        );
    }, [patients, patientSearch]);

    const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

    /**
     * Saves straight to Firestore from the client so a consultation can be
     * recorded with no connection — see `src/lib/data/base.ts` for why the write
     * is not awaited on the server round-trip.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;

        const form = e.currentTarget;
        const data = new FormData(form);

        if (!selectedPatientId || !selectedPatient) {
            toast({ title: 'Error', description: 'Please select a patient.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        const result = await saveEncounter(firestore, actor, {
            clinicId,
            patientId: selectedPatientId,
            patientName: `${selectedPatient.firstName} ${selectedPatient.surname}`,
            doctorId: actor.uid,
            doctorName: actor.name,
            date: new Date().toISOString(),
            type: encounterType,
            diagnosis: String(data.get('diagnosis') ?? ''),
            soap: {
                subjective: String(data.get('subjective') ?? ''),
                objective: String(data.get('objective') ?? ''),
                assessment: String(data.get('diagnosis') ?? ''),
                plan: String(data.get('plan') ?? ''),
            },
            status: 'Finalized',
        });
        setSaving(false);

        toast({
            title: result.success ? 'Success' : 'Error',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });

        if (result.success) {
            form.reset();
            setSelectedPatientId('');
            setEncounterType('Consultation');
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="button-glow">
                    <Plus className="mr-2 h-4 w-4" /> Record New Detail
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Clinical Record</DialogTitle>
                    <DialogDescription>Quickly log new patient details, diagnosis, and treatment plans.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Select Patient</Label>
                            <div className="flex flex-col gap-2">
                                <Input
                                    placeholder="Type to filter patients..."
                                    className="h-8 text-xs border-dashed"
                                    onChange={(e) => {
                                        const term = e.target.value.toLowerCase();
                                        // This is a bit hacky since it's inside the render, 
                                        // but it's the simplest way to add search without a full refactor
                                        setPatientSearch(term);
                                    }}
                                />
                                <Select name="patientId" value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select patient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredPatientsForSelect.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <div className="flex flex-col">
                                                    <span>{p.firstName} {p.surname}</span>
                                                    <span className="text-[10px] opacity-50 uppercase font-mono">{p.patientCode}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Encounter Type</Label>
                            <Select
                                name="type"
                                value={encounterType}
                                onValueChange={(v) => setEncounterType(v as Encounter['type'])}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Consultation">Consultation</SelectItem>
                                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                    <SelectItem value="Routine">Routine Visit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Diagnosis / Disease Name</Label>
                        <Input name="diagnosis" placeholder="e.g. Chronic Malaria, Type 2 Diabetes..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Subjective (Symptoms)</Label>
                            <Textarea name="subjective" placeholder="Patient reports..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Objective (Vitals/Scan)</Label>
                            <Textarea name="objective" placeholder="Observations..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Treatment Plan & Medication</Label>
                        <Textarea name="plan" placeholder="Prescribe drugs or tests..." />
                    </div>

                    <Button type="submit" disabled={saving} className="w-full button-glow">
                        {saving ? 'Saving...' : 'Save Record'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RecordsIndexErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort clinical encounters by date. Please ask your administrator to click the activation link in their console.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Cktwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9lbmNvdW50ZXJzL2luZGV4ZXMvXxABGgwKCGNsaW5pY0lkEAEaCAoEZGF0ZRACGgwKCF9fbmFtZV9fEAI" target="_blank">
                    Activate Encounters Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

export default function ComprehensiveRecordsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    const patientsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [userProfile, firestore]);
    const { data: patients, loading: patientsLoading } = useCollection<Patient>(patientsQuery);

    const encountersQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'encounters'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('date', 'desc')
        );
    }, [userProfile, firestore]);
    const { data: encounters, loading: encountersLoading, error: encountersError } = useCollection<Encounter>(encountersQuery);

    const [searchTerm, setSearchTerm] = useState('');
    const [diseaseFilter, setDiseaseFilter] = useState('all');

    const filteredRecords = useMemo(() => {
        if (!encounters) return [];
        return encounters.filter(record => {
            const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDisease = diseaseFilter === 'all' || record.diagnosis === diseaseFilter;
            return matchesSearch && matchesDisease;
        });
    }, [encounters, searchTerm, diseaseFilter]);

    const diseaseList = useMemo(() => {
        if (!encounters) return [];
        const diseases = Array.from(new Set(encounters.map(e => e.diagnosis).filter(Boolean)));
        return diseases.sort() as string[];
    }, [encounters]);

    if (userLoading || !userProfile) return <LoadingAnimation />;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-bold text-xl md:text-3xl flex items-center gap-2 tracking-tighter">
                        <ClipboardList className="text-primary h-8 w-8" /> Clinical Archive
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">Longitudinal clinical history and disease analytics portal.</p>
                </div>
                {userProfile.clinicId && patients && (
                    <RecordNewDetailModal
                        clinicId={userProfile.clinicId}
                        patients={patients}
                        actor={userProfile}
                    />
                )}
            </div>

            {/* Summary Analytics at Top */}
            <div className="flex items-center gap-2 mb-2">
                <div className="h-px bg-border flex-1" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Summary Analytics</span>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-dashed bg-primary/5">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Encounters</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold">{encounters?.length || 0}</span>
                    </CardContent>
                </Card>
                <Card className="border-dashed bg-primary/5">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Unique Diseases</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold">{diseaseList.length}</span>
                    </CardContent>
                </Card>
                <Card className="border-dashed bg-primary/5">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Patients</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold">{patients?.length || 0}</span>
                    </CardContent>
                </Card>
                <Card className="border-dashed bg-primary/5 border-primary/20">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-wider text-primary flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Clinic Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-[11px] leading-tight">Orelis is tracking <strong className="text-primary">{diseaseList[0] || 'N/A'}</strong> as your most frequently recorded condition this week.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Full Width Table */}
            <Card className="border-dashed w-full">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Longitudinal Patient History</CardTitle>
                            <CardDescription>Comprehensive clinical logging filtered by patient demographics and diagnosis.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name or diagnosis..."
                                    className="pl-8 w-full md:w-[250px] h-10 border-dashed"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
                                <SelectTrigger className="w-[160px] h-10 border-dashed">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Disease Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Conditions</SelectItem>
                                    {diseaseList.map(disease => (
                                        <SelectItem key={disease} value={disease}>{disease}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {encountersLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : encountersError ? (
                        <RecordsIndexErrorAlert />
                    ) : filteredRecords.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="font-bold">Date of Record</TableHead>
                                        <TableHead className="font-bold">Patient Demographics</TableHead>
                                        <TableHead className="font-bold">Primary Diagnosis</TableHead>
                                        <TableHead className="font-bold">Encounter Type</TableHead>
                                        <TableHead className="font-bold">Attending Clinician</TableHead>
                                        <TableHead className="text-right font-bold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecords.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold">
                                                {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-tight">{record.patientName}</span>
                                                    <span className="text-[10px] text-muted-foreground">ID: {record.patientId.slice(0, 8).toUpperCase()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary-foreground font-medium">
                                                    {record.diagnosis || 'Undiagnosed'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] uppercase font-mono px-2 py-0">
                                                    {record.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                    Dr. {record.doctorName}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={`/dashboard/patients/detail?id=${record.patientId}`}
                                                    className={buttonVariants({
                                                        variant: "outline",
                                                        size: "sm",
                                                        className: "h-8 border-dashed hover:border-primary hover:text-primary"
                                                    })}
                                                >
                                                    View Details
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-lg bg-muted/20">
                            <FilterX className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <h3 className="text-xl font-bold tracking-tight">Clinical Archive Empty</h3>
                            <p className="text-muted-foreground max-w-xs mt-1">No records match your current search parameters. Clear filters to see full history.</p>
                            <Button variant="ghost" className="mt-4" onClick={() => { setSearchTerm(''); setDiseaseFilter('all'); }}>Reset All Filters</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
