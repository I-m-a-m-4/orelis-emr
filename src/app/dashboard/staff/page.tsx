
'use client';
import { PlusCircle, ListFilter, MoreHorizontal, UserCog, User, ShieldCheck, View, Calendar, FilePlus, UserPlus, Link as LinkIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, doc, query, where, addDoc } from "firebase/firestore";
import type { UserProfile, UserRole } from "@/lib/types";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useDoc } from "@/firebase";
import { changeStaffRoleAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { LoadingAnimation } from "@/components/layout/loading-animation";

function InviteStaffModal({ clinicId }: { clinicId: string }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [role, setRole] = useState<UserRole>('receptionist');
    const [inviteLink, setInviteLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            const docRef = await addDoc(collection(firestore, 'invitations'), {
                clinicId,
                role,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            const link = `${window.location.origin}/invite/${docRef.id}`;
            setInviteLink(link);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        toast({ title: "Copied!", description: "Invite link copied to clipboard." });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Invite Staff</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Invite Link</DialogTitle>
                    <DialogDescription>Create a unique link to send to a new staff member. When they click it, they can set up their own account.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Role to Assign</Label>
                        <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="receptionist">Receptionist (Data Entry)</SelectItem>
                                <SelectItem value="doctor">Doctor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {inviteLink ? (
                        <div className="space-y-2">
                            <Label>Generated Link</Label>
                            <div className="flex items-center gap-2">
                                <Input value={inviteLink} readOnly />
                                <Button size="icon" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={handleGenerate} disabled={loading} className="w-full">
                            {loading ? "Generating..." : "Generate Link"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ChangeRoleSubMenu({ userId, clinicId }: { userId: string, clinicId: string }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRoleChange = async (newRole: UserRole) => {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('newRole', newRole);
        formData.append('clinicId', clinicId);

        const result = await changeStaffRoleAction(formData);

        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        setIsSubmitting(false);
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup onValueChange={(value) => handleRoleChange(value as UserRole)}>
                        <DropdownMenuRadioItem value="doctor">Doctor</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="receptionist">Receptionist</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
}

const roleCapabilities = {
    admin: [
        { icon: ShieldCheck, text: "Manage all staff accounts" },
        { icon: View, text: "View all clinic patients & appointments" },
        { icon: UserCog, text: "Change staff roles" },
    ],
    doctor: [
        { icon: View, text: "View and manage assigned patients" },
        { icon: Calendar, text: "View their own appointments" },
        { icon: FilePlus, text: "Add and edit patient notes/records" },
    ],
    receptionist: [
        { icon: UserPlus, text: "Add new patients" },
        { icon: Calendar, text: "Schedule and manage all appointments" },
        { icon: View, text: "View all patient contact information" },
    ],
};

function RoleCapabilitiesCard() {
    return (
        <Card className="border-dashed">
            <CardHeader>
                <CardTitle>Role Capabilities</CardTitle>
                <CardDescription>An overview of permissions for each staff role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><ShieldCheck className="text-primary" /> Admin</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                        {roleCapabilities.admin.map(cap => <li key={cap.text}>{cap.text}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><User className="text-primary" /> Doctor</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                        {roleCapabilities.doctor.map(cap => <li key={cap.text}>{cap.text}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><User className="text-primary" /> Receptionist</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                        {roleCapabilities.receptionist.map(cap => <li key={cap.text}>{cap.text}</li>)}
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}


export default function StaffPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const staffQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'users'),
            where('clinicId', '==', userProfile.clinicId)
        );
    }, [firestore, userProfile?.clinicId]);

    const { data: staff, loading: staffLoading } = useCollection<UserProfile>(staffQuery);

    const [roleFilter, setRoleFilter] = useState<string[]>(['admin', 'doctor', 'receptionist']);

    const filteredStaff = useMemo(() => {
        if (!staff) return [];
        return staff.filter(member => member.role !== 'patient' && roleFilter.includes(member.role));
    }, [staff, roleFilter]);

    const isLoading = userLoading || profileLoading || staffLoading;

    if (isLoading) {
        return <LoadingAnimation />;
    }

    const isAdmin = userProfile?.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-md border-dashed">
                    <UserCog className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view this page. Please contact an administrator.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }


    return (
        <div className="grid gap-6 items-start lg:grid-cols-3">
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center">
                    <h1 className="font-semibold text-lg md:text-2xl">Staff Management</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                    <ListFilter className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Filter
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={roleFilter.includes('doctor')} onCheckedChange={(checked) => setRoleFilter(prev => checked ? [...prev, 'doctor'] : prev.filter(r => r !== 'doctor'))}>Doctor</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={roleFilter.includes('receptionist')} onCheckedChange={(checked) => setRoleFilter(prev => checked ? [...prev, 'receptionist'] : prev.filter(r => r !== 'receptionist'))}>Receptionist</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={roleFilter.includes('admin')} onCheckedChange={(checked) => setRoleFilter(prev => checked ? [...prev, 'admin'] : prev.filter(r => r !== 'admin'))}>Admin</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {isAdmin && (
                            <>
                                <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                                    <Link href="/dashboard/staff/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            Manual Add
                                        </span>
                                    </Link>
                                </Button>
                                {userProfile?.clinicId && <InviteStaffModal clinicId={userProfile.clinicId} />}
                            </>
                        )}
                    </div>
                </div>
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle>Staff Accounts</CardTitle>
                        <CardDescription>Manage accounts for doctors, receptionists, and admins.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaff.map(member => (
                                    <TableRow key={member.uid}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{member.role}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{member.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className={member.status === 'active' ? 'bg-orange-500/10 text-orange-300' : 'bg-red-500/10 text-red-300'}>
                                                {member.status}
                                            </Badge>
                                        </TableCell>
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
                                                    {userProfile && isAdmin && member.uid !== user?.uid ? (
                                                        <ChangeRoleSubMenu userId={member.uid} clinicId={userProfile.clinicId!} />
                                                    ) : (
                                                        <DropdownMenuItem disabled>Change Role</DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    {isAdmin ? (
                                                        <DropdownMenuItem className="text-destructive" disabled={member.uid === user?.uid}>Deactivate</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem disabled>Deactivate</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <RoleCapabilitiesCard />
            </div>
        </div>
    )
}
