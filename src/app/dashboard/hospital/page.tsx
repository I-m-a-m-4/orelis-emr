
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { UserProfile, Clinic } from "@/lib/types";
import { Hospital, UserCog, Loader2, Link as LinkIcon, Phone, MapPin } from "lucide-react";
import { useMemo, useState, useEffect, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ClinicEditForm({ clinic }: { clinic: Clinic }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !clinic.id) return;
        setIsSaving(true);

        const formData = new FormData(e.currentTarget);
        const clinicData = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            website: formData.get('website') as string,
        };

        try {
            const clinicRef = doc(firestore, 'clinics', clinic.id);
            await updateDoc(clinicRef, clinicData);
            toast({
                title: "Success",
                description: "Clinic details updated successfully.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: `Could not update clinic: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Edit Clinic Details</CardTitle>
                    <CardDescription>Update your clinic's public information.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Clinic Name</Label>
                        <Input id="name" name="name" defaultValue={clinic.name} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Contact Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={clinic.email} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" defaultValue={clinic.phone} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" defaultValue={clinic.address} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Website URL</Label>
                        <Input id="website" name="website" placeholder="https://yourclinic.com" defaultValue={clinic.website} />
                    </div>
                </CardContent>
                <CardContent>
                    <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={isSaving} className="button-glow">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}


export default function HospitalPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const clinicRef = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', userProfile.clinicId);
    }, [userProfile, firestore]);
    const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

    const isLoading = userLoading || profileLoading || clinicLoading;


    if (isLoading) {
        return <div>Loading...</div>
    }

    if (userProfile?.role !== 'admin') {
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

    if (!clinic) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-md border-dashed">
                    <Hospital className="h-4 w-4" />
                    <AlertTitle>Clinic Not Found</AlertTitle>
                    <AlertDescription>
                        Could not find clinic details. Please contact support if this issue persists.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Clinic Settings</h1>
            </div>
            <div className="max-w-2xl mx-auto w-full">
                <ClinicEditForm clinic={clinic} />
            </div>
        </div>
    );
}
