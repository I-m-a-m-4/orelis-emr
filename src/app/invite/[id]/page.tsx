'use client';
import { useEffect, useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Hospital, UserCog } from "lucide-react";
import { useFirestore, useAuth } from '@/firebase/provider';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function InviteForm({ id }: { id: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const auth = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [inviteData, setInviteData] = useState<any>(null);
    const [clinicName, setClinicName] = useState('a clinic');

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        async function fetchInvite() {
            if (!firestore) return;
            try {
                const inviteRef = doc(firestore, 'invitations', id);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    const data = inviteSnap.data();
                    if (data.status !== 'pending') {
                        toast({ title: "Invalid Invite", description: "This invitation link has already been used.", variant: "destructive" });
                        setInviteData(null);
                    } else {
                        setInviteData({ id: inviteSnap.id, ...data });

                        // Fetch clinic name
                        const clinicSnap = await getDoc(doc(firestore, 'clinics', data.clinicId));
                        if (clinicSnap.exists()) {
                            setClinicName(clinicSnap.data().name);
                        }
                    }
                } else {
                    toast({ title: "Not Found", description: "Invalid invitation link.", variant: "destructive" });
                    setInviteData(null);
                }
            } catch (error) {
                console.error("Error fetching invite:", error);
                toast({ title: "Error", description: "Could not load invitation.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchInvite();
    }, [firestore, id, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !firestore || !inviteData) return;

        setSubmitting(true);
        try {
            // 1. Create User in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
            const user = userCredential.user;

            // 2. Create the User Document with the strict RBAC roles
            await setDoc(doc(firestore, 'users', user.uid), {
                uid: user.uid,
                email: form.email,
                name: form.name,
                role: inviteData.role,
                clinicId: inviteData.clinicId,
                status: 'active',
                // Required by firestore.rules: a self-written profile may only
                // claim an elevated role if an invitation vouches for it. The rule
                // re-reads this invitation server-side and checks that its role,
                // clinic and email all match, so a caller cannot simply assert a
                // role here.
                invitationId: inviteData.id,
                createdAt: new Date().toISOString()
            });

            // 3. Mark invite as accepted
            await updateDoc(doc(firestore, 'invitations', inviteData.id), {
                status: 'accepted',
                acceptedBy: user.uid,
                acceptedAt: new Date().toISOString()
            });

            toast({ title: "Welcome!", description: "Account created successfully. Redirecting..." });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ title: "Registration Error", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-muted-foreground animate-pulse">Verifying invitation...</p>
            </div>
        );
    }

    if (!inviteData) {
        return (
            <Card className="max-w-md mx-auto mt-20 border-dashed border-red-500/20 bg-red-500/5">
                <CardHeader>
                    <CardTitle className="text-red-500">Invitation Invalid</CardTitle>
                    <CardDescription>This link is either expired, already used, or does not exist.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-dashed shadow-xl border-orange-500/20 max-w-md mx-auto w-full glass-card gradient-glow">
            <CardHeader className="text-center">
                <div className="mx-auto bg-orange-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-4 text-orange-500">
                    <UserCog className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-bold">Join {clinicName}</CardTitle>
                <CardDescription>
                    You have been invited to join as a <strong className="text-foreground capitalize">{inviteData.role}</strong>. Please complete your profile to activate your account.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Create Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={submitting} className="w-full button-glow">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {submitting ? 'Creating Account...' : 'Join Clinic'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );

}

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="min-h-screen noisy-bg flex items-center justify-center p-4">
            <InviteForm id={id} />
        </div>
    );
}
