
'use client';
import { PlusCircle, ListFilter, MoreHorizontal, User as UserIcon, Search, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, doc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase/provider";
import type { Patient } from "@/lib/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDoc } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { DashLoader } from "@/components/ui/dash-loader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function DeletePatientDialog({ patient, clinicId, onDelete }: { patient: Patient, clinicId: string, onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);
        try {
            // A patient delete cascades across appointments, encounters,
            // invoices, prescriptions, labs and an Auth account, so it runs on
            // the server rather than the client — a cascade abandoned halfway
            // because a tab closed leaves orphaned billing records.
            const result = await apiFetch<{ success: boolean; message: string }>(
                '/api/admin/cascade-delete',
                {
                    method: 'POST',
                    body: { target: 'patient', patientId: patient.id, clinicId },
                    description: `Delete patient ${patient.firstName} ${patient.surname}`,
                }
            );
            if (result.queued) {
                toast({
                    title: "Queued",
                    description: "No connection — this patient will be deleted when you are back online.",
                });
                setOpen(false);
            } else if (result.ok) {
                toast({ title: "Deleted", description: result.data?.message ?? "Patient deleted." });
                setOpen(false);
                onDelete();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Patient
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">Delete Patient Data?</DialogTitle>
                    <DialogDescription className="text-center">
                        This will permanently delete <strong>{patient.firstName} {patient.surname}</strong> and all their appointments, encounters, and invoices.
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} className="flex-1" disabled={loading}>
                        {loading ? <DashLoader size="sm" className="text-white" /> : 'Delete Permanently'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PatientsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const patientsCollection = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile?.clinicId]);

    const { data: patients, loading } = useCollection<Patient>(patientsCollection);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<('Active' | 'Inactive')[]>(['Active', 'Inactive']);

    const filteredPatients = useMemo(() => {
        if (!patients) return [];
        return patients.filter(patient => {
            const name = `${patient.firstName} ${patient.surname}`.toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = name.includes(search) ||
                patient.email?.toLowerCase().includes(search) ||
                patient.patientCode?.toLowerCase().includes(search);
            const matchesStatus = statusFilter.includes(patient.status || 'Active');
            return matchesSearch && matchesStatus;
        });
    }, [patients, searchTerm, statusFilter]);

    const isLoading = loading || profileLoading;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Patients</h1>
                <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search patients..."
                            className="pl-8 sm:w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 gap-1">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Filter
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={statusFilter.includes('Active')}
                                onCheckedChange={(checked) => {
                                    setStatusFilter(prev => checked ? [...prev, 'Active'] : prev.filter(s => s !== 'Active'))
                                }}
                            >
                                Active
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={statusFilter.includes('Inactive')}
                                onCheckedChange={(checked) => {
                                    setStatusFilter(prev => checked ? [...prev, 'Inactive'] : prev.filter(s => s !== 'Inactive'))
                                }}
                            >
                                Inactive
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" className="h-10 gap-1" asChild>
                        <Link href="/dashboard/patients/new">
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Add Patient
                            </span>
                        </Link>
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Patient Records</CardTitle>
                    <CardDescription>Manage your hospital's patient records.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">
                                    <span className="sr-only">Image</span>
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Code</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead className="hidden md:table-cell">Last Visit</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Loading patients...</TableCell>
                                </TableRow>
                            ) : filteredPatients.length > 0 ? filteredPatients.map(patient => (
                                <TableRow key={patient.id} className={patient.hasPendingWrites ? 'bg-muted/30' : ''}>
                                    <TableCell className="hidden sm:table-cell">
                                        <Avatar>
                                            <AvatarFallback>{getInitials(`${patient.firstName} ${patient.surname}`)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {patient.firstName} {patient.surname}
                                        {patient.hasPendingWrites && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <History className="h-4 w-4 text-muted-foreground animate-pulse" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Changes pending, will sync when online.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <code className="bg-primary/5 text-primary px-2 py-1 rounded-md font-bold font-mono text-xs">
                                            {patient.patientCode}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={patient.status === 'Active' ? 'default' : 'secondary'} className={patient.status === 'Active' ? 'bg-orange-500/10 text-orange-300' : 'bg-red-500/10 text-red-300'}>
                                            {patient.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{patient.email}</TableCell>
                                    <TableCell className="hidden md:table-cell">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <Link href={`/dashboard/patients/detail?id=${patient.id}`}>View Details</Link>
                                                </DropdownMenuItem>
                                                {userProfile?.role !== 'receptionist' && (
                                                    <DropdownMenuItem asChild className="cursor-pointer">
                                                        <Link href={`/dashboard/encounters/new?patientId=${patient.id}`}>New Consultation (SOAP)</Link>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <Link href={`/dashboard/patients/edit?id=${patient.id}`}>Edit</Link>
                                                </DropdownMenuItem>

                                                {userProfile?.clinicId && (
                                                    <DeletePatientDialog
                                                        patient={patient}
                                                        clinicId={userProfile.clinicId}
                                                        onDelete={() => { }}
                                                    />
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">No patients found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
