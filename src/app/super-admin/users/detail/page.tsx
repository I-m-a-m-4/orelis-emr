'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, runTransaction } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowLeft,
    Ban,
    Building,
    Fingerprint,
    Globe,
    KeyRound,
    Laptop,
    ShieldAlert,
    Smartphone,
    UserCheck,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Clinic, UserProfile } from '@/lib/types';
import { getAuth } from 'firebase/auth';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
        <div className="mt-1 break-words text-sm font-medium">{children || <span className="text-muted-foreground">—</span>}</div>
    </div>
);

// Inline helper functions
function toDate(input?: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number' || typeof input === 'string') return new Date(input);
  if (input.toDate && typeof input.toDate === 'function') return input.toDate();
  return null;
}

function UserPresence({ lastSeen, status }: { lastSeen?: any, status?: string }) {
  if (status === 'inactive') return <span className="text-muted-foreground">Inactive</span>;
  const d = toDate(lastSeen);
  if (!d) return <span className="text-muted-foreground">Never</span>;
  return <span>{formatDistanceToNow(d, { addSuffix: true })}</span>;
}

function UserDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();

    const userId = searchParams.get('id');

    const [tab, setTab] = React.useState('overview');
    
    const [confirm, setConfirm] = React.useState<null | 'activate' | 'deactivate'>(null);
    const [busy, setBusy] = React.useState(false);

    const userRef = React.useMemo(
        () => (firestore && userId ? doc(firestore, 'users', userId) : null),
        [firestore, userId],
    );
    const { data: user, loading: userLoading } = useDoc<UserProfile>(userRef);

    const clinicRef = React.useMemo(
        () => (firestore && user?.clinicId ? doc(firestore, 'clinics', user.clinicId) : null),
        [firestore, user?.clinicId],
    );
    const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

    const isSelf = authUser?.uid === userId;

    const handleStatus = async (action: 'activate' | 'deactivate') => {
        if (!firestore || !user || !user.id) return;
        setBusy(true);
        try {
            const ref = doc(firestore, 'users', user.id);
            await runTransaction(firestore, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error('User does not exist.');
                tx.update(ref, { status: action === 'activate' ? 'active' : 'inactive' });
            });
            toast({ title: `User ${action}d`, description: `${user.name}'s account has been ${action}d.`, variant: 'default' });
        } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Could not update status.', variant: 'destructive' });
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    if (!userId) {
        return (
            <Card className="p-12 text-center">
                <h2 className="text-lg font-semibold">No user selected</h2>
                <p className="mt-1 text-sm text-muted-foreground">This page needs a user id in the address.</p>
                <Button className="mt-4" onClick={() => router.push('/super-admin/users')}>
                    Back to all users
                </Button>
            </Card>
        );
    }

    if (userLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-9 w-40" />
                <Card className="p-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-80" />
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <Card className="p-12 text-center">
                <h2 className="text-lg font-semibold">User not found</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    No account with id <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{userId}</code>.
                    It may have been deleted.
                </p>
                <Button className="mt-4" onClick={() => router.push('/super-admin/users')}>
                    Back to all users
                </Button>
            </Card>
        );
    }

    const blocked = (user as any).status === 'inactive' || (user as any).status === 'suspended';
    const DeviceIcon = (user as any).deviceType?.includes('Desktop')
        ? Laptop
        : (user as any).deviceType?.includes('Mobile') ? Smartphone : Globe;

    return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push('/super-admin/users')}>
                <ArrowLeft className="h-4 w-4" /> All users
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
                                {user.name}
                                <Badge variant={blocked ? 'destructive' : 'outline'} className="capitalize">
                                    {user.status || 'active'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1 break-all">
                                {user.email}
                                {clinic?.name ? ` · ${clinic.name}` : ''}
                            </CardDescription>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {blocked ? (
                                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy || isSelf} onClick={() => setConfirm('activate')}>
                                    <UserCheck className="h-3.5 w-3.5" /> Activate
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy || isSelf} onClick={() => setConfirm('deactivate')}>
                                    <Ban className="h-3.5 w-3.5" /> Deactivate
                                </Button>
                            )}
                        </div>
                    </div>

                    {isSelf && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            This is your own account, so the status controls are disabled.
                        </p>
                    )}
                </CardHeader>

                <CardContent>
                    <Tabs value={tab} onValueChange={setTab}>
                        <div className="overflow-x-auto">
                            <TabsList className="inline-flex w-auto">
                                <TabsTrigger value="overview" className="gap-1.5 text-xs"><Fingerprint className="h-3.5 w-3.5" /> Overview</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="mt-4 space-y-4">
                            {blocked && (
                                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                    <div className="text-xs">
                                        <p className="font-medium text-destructive">
                                            This account is {user.status}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Card className="p-4">
                                <h3 className="mb-3 text-sm font-semibold">Identity</h3>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <Field label="Full name">{user.name}</Field>
                                    <Field label="Email">{user.email}</Field>
                                    <Field label="Role">
                                        <span className="capitalize">{(user.role || 'doctor').replace('_', ' ')}</span>
                                    </Field>
                                    <Field label="User ID">
                                        <code className="font-mono text-[10px]">{user.id || user.uid}</code>
                                    </Field>
                                    <Field label="Clinic ID">{user.clinicId}</Field>
                                    <Field label="Onboarding">
                                        {user.onboardingCompleted ? 'Completed' : 'Not completed'}
                                    </Field>
                                    <Field label="Last seen"><UserPresence lastSeen={(user as any).lastSeen} status={(user as any).status} /></Field>
                                </div>
                            </Card>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="p-4">
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                        <Building className="h-4 w-4 text-primary" /> Clinic &amp; plan
                                    </h3>
                                    {clinicLoading ? (
                                        <Skeleton className="h-24 w-full" />
                                    ) : clinic ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Clinic">{clinic.name}</Field>
                                            <Field label="Plan">
                                                <span className="capitalize">{clinic.subscription?.plan || 'Free'}</span>
                                            </Field>
                                            <Field label="Subscription Status">
                                                <span className="capitalize">{clinic.subscription?.status || 'Unknown'}</span>
                                            </Field>
                                            <Field label="Staff Count">{clinic.staffCount || 0}</Field>
                                            <Field label="Location">
                                                {[clinic.country].filter(Boolean).join(', ')}
                                            </Field>
                                            <Field label="Email">{clinic.email}</Field>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No clinic resolves for this user
                                            {user.clinicId ? ` (id ${user.clinicId})` : ''}.
                                        </p>
                                    )}
                                </Card>

                                <Card className="p-4">
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                        <DeviceIcon className="h-4 w-4 text-primary" /> Device &amp; app
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Device">{(user as any).deviceType || 'Web'}</Field>
                                        <Field label="Country">{user.country}</Field>
                                        <Field label="App version">
                                            {(user as any).appVersion || 'Web'}
                                        </Field>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirm action
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === 'deactivate' && (
                                <>This marks <strong>{user.name}</strong> inactive so they cannot log in again. Their data is preserved.</>
                            )}
                            {confirm === 'activate' && (
                                <>This reactivates <strong>{user.name}</strong>'s account and lets them log in again.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={busy}
                            className={confirm === 'activate' ? '' : 'bg-destructive hover:bg-destructive/90'}
                            onClick={(e) => {
                                e.preventDefault();
                                if (confirm) handleStatus(confirm);
                            }}
                        >
                            {busy ? 'Working…' : confirm === 'activate' ? 'Activate' : 'Deactivate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function UserDetailPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <UserDetailContent />
        </Suspense>
    );
}
