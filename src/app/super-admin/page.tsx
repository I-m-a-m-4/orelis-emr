
'use client';
import * as React from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Clinic, Patient, UserProfile } from '@/lib/types';
import { StatCard } from '@/components/dashboard/stat-card';
import { Hospital, Users, BadgeDollarSign, MoreHorizontal, Trash2, CalendarClock, Ban, Code2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { deleteClinicAction, setExpiryDateAction, revokeAccessAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { GrantInfiniteButton } from './grant-infinite-button';
import AnalyticsClient from './analytics-client';

function DeleteClinicDialog({ clinicId, clinicName }: { clinicId: string, clinicName: string }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        const formData = new FormData();
        formData.append('clinicId', clinicId);
        const result = await deleteClinicAction(formData);
        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the clinic &quot;{clinicName}&quot; and all of its associated data, including patients, appointments, and staff accounts.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, delete clinic
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ClinicActions({ clinic }: { clinic: Clinic }) {
    const { toast } = useToast();
    const [date, setDate] = useState<Date | undefined>();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleAction = async (action: (formData: FormData) => Promise<{ success: boolean, message: string }>, formData: FormData) => {
        const result = await action(formData);
        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
    };

    const handleSetExpiry = () => {
        if (!date || !clinic.id) return;
        const formData = new FormData();
        formData.append('clinicId', clinic.id);
        formData.append('expiryDate', date.toISOString());
        handleAction(setExpiryDateAction, formData);
        setIsPopoverOpen(false); // Close popover on save
    };

    const createHandler = (action: (formData: FormData) => Promise<{ success: boolean, message: string }>) => () => {
        if (!clinic.id) return;
        const formData = new FormData();
        formData.append('clinicId', clinic.id);
        handleAction(action, formData);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <Link href={`/super-admin/clinics/${clinic.id}`}>View Details</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <CalendarClock className="mr-2 h-4 w-4" />
                        <span>Manage Subscription</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 py-1.5" onClick={() => setIsPopoverOpen(true)}>
                                        <CalendarClock className="mr-2 h-4 w-4" /> Set Expiry Date
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    <div className="p-2 border-t">
                                        <Button onClick={handleSetExpiry} disabled={!date} size="sm" className="w-full">Save Date</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <DropdownMenuItem asChild>
                                <GrantInfiniteButton clinicId={clinic.id!} />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={createHandler(revokeAccessAction)}>
                                <Ban className="mr-2 h-4 w-4" /> Revoke Access
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DeleteClinicDialog clinicId={clinic.id!} clinicName={clinic.name} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SuperAdminDashboard({ clinics, patients, users, loading }: { clinics: Clinic[] | null, patients: Patient[] | null, users: UserProfile[] | null, loading: boolean }) {

    const analyticsData = useMemo(() => {
        if (!clinics || !patients) return {
            submissionsOverTime: [],
            subscriptionDistribution: [],
            statusDistribution: [],
            countryDistribution: []
        };

        const countOccurrences = (arr: (string | undefined)[]) => {
            const counts: { [key: string]: number } = {};
            arr.flat().forEach(item => {
                const key = item || 'N/A';
                counts[key] = (counts[key] || 0) + 1;
            });
            return Object.entries(counts).map(([name, value]) => ({ name, value }));
        }

        const submissionsByDate: { [key: string]: number } = {};
        patients.forEach(p => {
            if (p.registrationDate) {
                const date = format(new Date(p.registrationDate), 'MMM d');
                submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
            }
        });
        const submissionsOverTime = Object.entries(submissionsByDate).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const subscriptionPlans = clinics.map(c => c.subscription?.plan);
        const subscriptionDistribution = countOccurrences(subscriptionPlans);

        const subscriptionStatus = clinics.map(c => c.subscription?.status);
        const statusDistribution = countOccurrences(subscriptionStatus);

        const countries = clinics.map(c => c.country);
        const countryDistribution = countOccurrences(countries);

        return {
            submissionsOverTime,
            subscriptionDistribution,
            statusDistribution,
            countryDistribution
        };
    }, [clinics, patients]);

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <StatCard title="Total Clinics" value={loading ? '...' : (clinics?.length || 0).toString()} icon={<Hospital className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Total Patients" value={loading ? '...' : (patients?.length || 0).toString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Total Users" value={loading ? '...' : (users?.length || 0).toString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Active Developers" value={loading ? '...' : (clinics?.filter(c => c.apiConfig?.apiKey).length || 0).toString()} icon={<Code2 className="h-4 w-4 text-primary" />} />
                <StatCard title="Paid Subscriptions" value={loading ? '...' : (clinics?.filter(c => c.subscription?.plan === 'price_annual' || c.subscription?.plan === 'infinite').length || 0).toString()} icon={<BadgeDollarSign className="h-4 w-4 text-muted-foreground" />} />
            </div>

            {analyticsData && <AnalyticsClient {...analyticsData} />}

            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Clinic Management</CardTitle>
                    <CardDescription>Oversee all clinics on the Orelis platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Clinic Name</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Subscription Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Patient Count</TableHead>
                                <TableHead>Expiry Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">Loading clinics...</TableCell>
                                </TableRow>
                            ) : clinics?.map(clinic => (
                                <TableRow key={clinic.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/super-admin/clinics/${clinic.id}`} className="hover:underline text-primary">
                                            {clinic.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{clinic.country}</TableCell>
                                    <TableCell>
                                        <Badge variant={clinic.subscription?.plan === 'infinite' ? 'default' : 'outline'}>
                                            {clinic.subscription?.plan || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={clinic.subscription?.status === 'active' || clinic.subscription?.status === 'trialing' ? 'default' : 'secondary'} className={(clinic.subscription?.status === 'active' || clinic.subscription?.status === 'trialing') ? 'bg-orange-500/10 text-orange-300' : ''}>
                                            {clinic.subscription?.status || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{patients?.filter(p => p.clinicId === clinic.id).length || 0}</TableCell>
                                    <TableCell>
                                        {clinic.subscription?.plan === 'infinite' ? 'N/A' : clinic.subscription?.expiryDate ? format(new Date(clinic.subscription.expiryDate), 'PPP') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <ClinicActions clinic={clinic} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}


export default function SuperAdminPage() {
    const firestore = useFirestore();

    const clinicsCollection = useMemo(() => firestore ? collection(firestore, 'clinics') : null, [firestore]);
    const { data: clinics, loading: clinicsLoading } = useCollection<Clinic>(clinicsCollection);

    const patientsCollection = useMemo(() => firestore ? query(collection(firestore, 'patients')) : null, [firestore]);
    const { data: patients, loading: patientsLoading } = useCollection<Patient>(patientsCollection);

    const usersCollection = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersCollection);

    const isLoading = clinicsLoading || patientsLoading || usersLoading;

    return (
        <div className="flex flex-col gap-4 md:gap-8 noisy-bg -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Super Admin Dashboard</h1>
            </div>
            <SuperAdminDashboard clinics={clinics} patients={patients} users={users} loading={isLoading} />
        </div>
    );
}
