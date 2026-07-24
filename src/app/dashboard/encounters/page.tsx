'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import Link from 'next/link';
import { Plus, Search, Filter, Stethoscope, FileText, User, Activity, AlertCircle, ExternalLink } from "lucide-react";
import type { Appointment, UserProfile } from "@/lib/types";

function AppointmentIndexErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort Clinical Records (appointments) by date. Please ask your administrator to click the activation link in their console.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Cktwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9hcHBvaW50bWVudHMvaW5kZXhlcy9fEAEaDAoIY2xpbmljSWQQARoTCg9hcHBvaW50bWVudERhdGUQAhoMCghfX25hbWVfXxAC" target="_blank">
                    Activate Appointments Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

export default function ClinicalRecordsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const [diseaseFilter, setDiseaseFilter] = useState('');

    // Load user role
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Load encounters from appointments (which act as visits)
    // We assume the doctor added notes (diagnosis) to the appointment object, or we look at the 'encounters' collection.
    const encountersQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'appointments'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('appointmentDate', 'desc')
        );
    }, [firestore, userProfile?.clinicId]);

    const { data: encounters, loading, error: appointmentsError } = useCollection<any>(encountersQuery);

    const filteredEncounters = useMemo(() => {
        if (!encounters) return [];
        return encounters.filter(enc => {
            const matchesSearch = enc.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                enc.disease?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                enc.notes?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesDisease = diseaseFilter === '' || enc.disease?.toLowerCase().includes(diseaseFilter.toLowerCase()) || enc.notes?.toLowerCase().includes(diseaseFilter.toLowerCase());

            return matchesSearch && matchesDisease;
        });
    }, [encounters, searchQuery, diseaseFilter]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-2xl tracking-tight">Clinical Records (EMR)</h1>
                    <p className="text-muted-foreground text-sm">Comprehensive patient records, encounters, and diagnoses.</p>
                </div>
                <Button asChild className="button-glow">
                    <Link href="/dashboard/patients">
                        <Plus className="mr-2 h-4 w-4" />
                        Record New Encounter
                    </Link>
                </Button>
            </div>

            <Card className="border-dashed backdrop-blur-sm bg-background/50">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                    <div className="flex items-center gap-2 flex-1 w-full max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find patient or record..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background/50"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1 w-full max-w-sm">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by diagnosis / disease..."
                            value={diseaseFilter}
                            onChange={(e) => setDiseaseFilter(e.target.value)}
                            className="bg-background/50"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Activity className="h-8 w-8 text-orange-500 animate-pulse" />
                        </div>
                    ) : appointmentsError ? (
                        <AppointmentIndexErrorAlert />
                    ) : filteredEncounters.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Diagnosis / Disease</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEncounters.map((enc) => (
                                        <TableRow key={enc.id}>
                                            <TableCell className="font-medium">
                                                {new Date(enc.appointmentDate).toLocaleDateString()}
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(enc.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {enc.patientName}
                                                </div>
                                            </TableCell>
                                            <TableCell>Dr. {enc.doctorName}</TableCell>
                                            <TableCell>
                                                {enc.disease || enc.assessment ? (
                                                    <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10">
                                                        {enc.disease || enc.assessment || enc.type}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm italic">Pending</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={enc.status === 'Completed' ? 'default' : 'secondary'}>
                                                    {enc.status || 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" asChild className="hover:text-orange-500">
                                                    <Link href={`/dashboard/encounters/new?patientId=${enc.patientId}&appointmentId=${enc.id}`}>
                                                        <FileText className="h-4 w-4" />
                                                        <span className="sr-only">View/Edit</span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                            <Stethoscope className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p>No medical records found matching your filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
