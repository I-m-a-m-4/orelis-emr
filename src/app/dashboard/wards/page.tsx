'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { Bed, Users, Plus, Hospital, LogOut, CheckCircle2, AlertCircle, Search, LayoutGrid, List } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashLoader } from "@/components/ui/dash-loader";
import type { Ward, Bed as BedType, Admission, Patient } from "@/lib/types";

export default function WardsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    // Fetch Wards
    const wardsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(collection(firestore, 'wards'), where('clinicId', '==', userProfile.clinicId));
    }, [userProfile, firestore]);
    const { data: wards, loading: wardsLoading } = useCollection<Ward>(wardsQuery);

    // Fetch Admissions
    const admissionsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'admissions'),
            where('clinicId', '==', userProfile.clinicId),
            where('status', '==', 'Admitted')
        );
    }, [userProfile, firestore]);
    const { data: admissions, loading: admissionsLoading } = useCollection<Admission>(admissionsQuery);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                        <Bed className="text-primary" /> Ward Management
                    </h1>
                    <p className="text-sm text-muted-foreground">Monitor ward occupancy, manage beds, and handle inpatient admissions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <AddWardDialog clinicId={userProfile?.clinicId} />
                    <AdmitPatientDialog clinicId={userProfile?.clinicId} wards={wards || []} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Total Wards</CardDescription>
                        <CardTitle className="text-2xl">{wards?.length || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Occupied Beds</CardDescription>
                        <CardTitle className="text-2xl text-orange-500">{admissions?.length || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Admitted Today</CardDescription>
                        <CardTitle className="text-2xl text-blue-500">
                            {admissions?.filter(a => new Date(a.admittedAt).toDateString() === new Date().toDateString()).length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Available Capacity</CardDescription>
                        <CardTitle className="text-2xl text-green-500">
                            {wards ? (wards.reduce((acc, w) => acc + w.totalBeds, 0) - (admissions?.length || 0)) : 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
                    <TabsTrigger value="overview">Ward Overview</TabsTrigger>
                    <TabsTrigger value="admissions">Current Admissions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wardsLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : wards && wards.length > 0 ? (
                            wards.map((ward) => (
                                <WardCard key={ward.id} ward={ward} admissions={admissions || []} />
                            ))
                        ) : (
                            <div className="md:col-span-3 py-20 text-center border-2 border-dashed rounded-lg bg-orange-500/5">
                                <Hospital className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="font-medium text-lg">No wards configured</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">Create your first ward (e.g. Male Ward, ICU) to start managing admissions.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="admissions" className="mt-6">
                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Inpatient Directory</CardTitle>
                            <CardDescription>Track all patients currently admitted in various wards.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {admissionsLoading ? (
                                <Skeleton className="h-40 w-full" />
                            ) : admissions && admissions.length > 0 ? (
                                <div className="space-y-4">
                                    {admissions.map((admission) => (
                                        <AdmissionRow key={admission.id} admission={admission} />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
                                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="font-medium">No patients currently admitted</h3>
                                    <p className="text-sm text-muted-foreground">Your active inpatient records will appear here.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/** Who is actually in this ward — the question "Details" was silently refusing. */
function WardDetailsDialog({ ward, admissions }: { ward: Ward; admissions: Admission[] }) {
    const [open, setOpen] = useState(false);
    const free = Math.max(0, ward.totalBeds - admissions.length);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold cursor-pointer">
                    Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {ward.name}
                        <Badge variant="secondary">{ward.type}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {admissions.length} of {ward.totalBeds} beds occupied · {free} free
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {admissions.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Bed</TableHead>
                                    <TableHead>Admitted</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admissions.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">{a.patientName}</TableCell>
                                        <TableCell>{a.bedNumber}</TableCell>
                                        <TableCell className="text-xs">
                                            {a.admittedAt ? new Date(a.admittedAt).toLocaleDateString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {a.reason || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No patients are currently admitted to this ward.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function WardCard({ ward, admissions }: { ward: Ward, admissions: Admission[] }) {
    const wardAdmissions = admissions.filter(a => a.wardId === ward.id);
    const occupancyRate = (wardAdmissions.length / ward.totalBeds) * 100;

    return (
        <Card className="border-dashed overflow-hidden group hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2">{ward.type}</Badge>
                        <CardTitle className="text-lg">{ward.name}</CardTitle>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold">{wardAdmissions.length}</span>
                        <span className="text-muted-foreground text-xs block">of {ward.totalBeds} Beds</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-4">
                    <div
                        className={`h-full transition-all duration-500 ${occupancyRate > 90 ? 'bg-red-500' : occupancyRate > 70 ? 'bg-orange-500' : 'bg-primary'}`}
                        style={{ width: `${occupancyRate}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Occupancy</span>
                    <span className="text-[10px] font-bold">{Math.round(occupancyRate)}%</span>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-dashed py-3 flex justify-between">
                <WardDetailsDialog ward={ward} admissions={wardAdmissions} />
                <div className="flex -space-x-2">
                    {wardAdmissions.slice(0, 3).map((a, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[8px] font-bold" title={a.patientName}>
                            {a.patientName.charAt(0)}
                        </div>
                    ))}
                    {wardAdmissions.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold">
                            +{wardAdmissions.length - 3}
                        </div>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

function AdmissionRow({ admission }: { admission: Admission }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleDischarge = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            await updateDoc(doc(firestore, 'admissions', admission.id), {
                status: 'Discharged',
                dischargedAt: new Date().toISOString()
            });
            toast({ title: "Discharged", description: `${admission.patientName} has been discharged.` });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-card hover:border-primary/50 transition-colors group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">{admission.patientName}</h4>
                    <p className="text-xs text-muted-foreground">{admission.reason}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Admitted {new Date(admission.admittedAt).toLocaleDateString()} at {new Date(admission.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Location</p>
                    <p className="text-xs font-semibold">{admission.wardName} • Bed {admission.bedNumber}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-dashed text-orange-600 hover:bg-orange-600 hover:text-white h-9 cursor-pointer"
                    onClick={handleDischarge}
                    disabled={loading}
                >
                    {loading ? <DashLoader size="sm" className="mr-2" /> : <LogOut className="h-4 w-4 mr-2" />} Discharge
                </Button>
            </div>
        </div>
    );
}

function AddWardDialog({ clinicId }: { clinicId?: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !clinicId) return;
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            await addDoc(collection(firestore, 'wards'), {
                clinicId,
                name: formData.get('name'),
                type: formData.get('type'),
                totalBeds: parseInt(formData.get('totalBeds') as string),
                createdAt: serverTimestamp()
            });
            toast({ title: "Success", description: "Ward created successfully." });
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed h-10">
                    <Plus className="mr-2 h-4 w-4" /> Create Ward
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>New Clinical Ward</DialogTitle>
                        <DialogDescription>Add a new ward to your hospital facility.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Ward Name</Label>
                            <Input id="name" name="name" className="col-span-3" placeholder="e.g. Male Surgical Ward" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select name="type" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Private">Private</SelectItem>
                                    <SelectItem value="ICU">ICU</SelectItem>
                                    <SelectItem value="Maternity">Maternity</SelectItem>
                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="totalBeds" className="text-right">Total Beds</Label>
                            <Input id="totalBeds" name="totalBeds" type="number" className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Creating...' : 'Create Ward'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AdmitPatientDialog({ clinicId, wards }: { clinicId?: string, wards: Ward[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch Patients for selection
    const patientsQuery = useMemo(() => {
        if (!clinicId || !firestore) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', clinicId));
    }, [clinicId, firestore]);
    const { data: patients } = useCollection<Patient>(patientsQuery);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !clinicId) return;
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const patientId = formData.get('patientId') as string;
        const patient = patients?.find(p => p.id === patientId);
        const wardId = formData.get('wardId') as string;
        const ward = wards.find(w => w.id === wardId);

        try {
            await addDoc(collection(firestore, 'admissions'), {
                clinicId,
                patientId,
                patientName: `${patient?.firstName} ${patient?.surname}`,
                wardId,
                wardName: ward?.name,
                bedNumber: formData.get('bedNumber'),
                reason: formData.get('reason'),
                admittedAt: new Date().toISOString(),
                status: 'Admitted'
            });
            toast({ title: "Admitted", description: "Patient has been successfully admitted." });
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="button-glow h-10">
                    <Plus className="mr-2 h-4 w-4" /> Admit Patient
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Inpatient Admission</DialogTitle>
                        <DialogDescription>Register a patient for hospital admission.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Patient</Label>
                            <Select name="patientId" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select patient" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients?.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.firstName} {p.surname}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Ward</Label>
                            <Select name="wardId" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select ward" />
                                </SelectTrigger>
                                <SelectContent>
                                    {wards.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bedNumber" className="text-right">Bed #</Label>
                            <Input id="bedNumber" name="bedNumber" className="col-span-3" placeholder="e.g. B-12" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reason" className="text-right">Reason</Label>
                            <Input id="reason" name="reason" className="col-span-3" placeholder="e.g. Post-op Recovery" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Admitting...' : 'Confirm Admission'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
