'use client';
import { useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import type { Clinic, Patient, Staff } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Hospital, Users, Calendar, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function DetailItem({ label, value }: { label: string, value: string | number | undefined | null }) {
    if (!value && value !== 0) return null;
    return (
        <div className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-muted-foreground col-span-1">{label}</dt>
            <dd className="text-foreground col-span-2">{value}</dd>
        </div>
    )
}

export default function ClinicDetailPage() {
    const { id: clinicId } = useParams();
    const firestore = useFirestore();
    const router = useRouter();

    const clinicDocRef = useMemo(() => {
        if (!clinicId || !firestore) return null;
        return doc(firestore, 'clinics', clinicId as string);
    }, [clinicId, firestore]);
    const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicDocRef);

    const patientsQuery = useMemo(() => {
        if (!clinicId || !firestore) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', clinicId));
    }, [clinicId, firestore]);
    const { data: patients, loading: patientsLoading } = useCollection<Patient>(patientsQuery);
    
    const staffQuery = useMemo(() => {
        if (!clinicId || !firestore) return null;
        return query(collection(firestore, 'users'), where('clinicId', '==', clinicId));
    }, [clinicId, firestore]);
    const { data: staff, loading: staffLoading } = useCollection<Staff>(staffQuery);

    const appointmentsQuery = useMemo(() => {
        if (!clinicId || !firestore) return null;
        return query(collection(firestore, 'appointments'), where('clinicId', '==', clinicId));
    }, [clinicId, firestore]);
    const { data: appointments, loading: appointmentsLoading } = useCollection(appointmentsQuery);
    
    const isLoading = clinicLoading || patientsLoading || staffLoading || appointmentsLoading;

    if (isLoading) {
        return (
             <div className="flex flex-col gap-4 noisy-bg">
                <div className="flex items-center gap-4">
                     <Skeleton className="h-10 w-10" />
                     <Skeleton className="h-8 w-48" />
                </div>
                <Card className="border-dashed">
                    <CardHeader>
                         <Skeleton className="h-8 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!clinic) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full noisy-bg">
                <Alert variant="destructive" className="max-w-md border-dashed">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Clinic Not Found</AlertTitle>
                    <AlertDescription>
                        The clinic you are looking for does not exist.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 noisy-bg">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                 </Button>
                <h1 className="font-semibold text-lg md:text-2xl">{clinic.name}</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Patients" value={(patients?.length || 0).toString()} icon={<Users />} />
                <StatCard title="Total Staff" value={(staff?.length || 0).toString()} icon={<UserIcon />} />
                <StatCard title="Total Appointments" value={(appointments?.length || 0).toString()} icon={<Calendar />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="border-dashed">
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2"><Hospital /> Clinic Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <DetailItem label="Email" value={clinic.email} />
                            <DetailItem label="Phone" value={clinic.phone} />
                            <DetailItem label="Address" value={clinic.address} />
                            <DetailItem label="Country" value={clinic.country} />
                        </CardContent>
                    </Card>
                     <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <DetailItem label="Plan" value={clinic.subscription?.plan} />
                             <DetailItem label="Status" value={clinic.subscription?.status} />
                             <DetailItem 
                                label="Expiry Date" 
                                value={clinic.subscription?.plan === 'infinite' ? 'N/A' : clinic.subscription?.expiryDate ? new Date(clinic.subscription.expiryDate).toLocaleDateString() : 'N/A'} 
                             />
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2 grid gap-6">
                     <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Staff Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff && staff.length > 0 ? staff.map(member => (
                                        <TableRow key={member.uid}>
                                            <TableCell>{member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell><Badge variant="outline">{member.role}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No staff found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Recent Patients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Registered</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {patients && patients.length > 0 ? patients.slice(0,5).map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.firstName} {p.surname}</TableCell>
                                            <TableCell>{p.email}</TableCell>
                                            <TableCell>{new Date(p.registrationDate).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No patients found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
