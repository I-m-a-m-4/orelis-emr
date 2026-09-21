'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  MoreHorizontal,
  AlertCircle,
  UserCheck,
  UserX,
  Search,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, doc, query, runTransaction } from 'firebase/firestore';
import type { UserProfile, Clinic } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Helper inline components and utilities to replace missing Zeneva dependencies
function toDate(input?: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number' || typeof input === 'string') return new Date(input);
  if (input.toDate && typeof input.toDate === 'function') return input.toDate();
  return null;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export type UserSegment = 'power' | 'active' | 'at_risk' | 'dormant' | 'new';
const SEGMENT_LABELS: Record<UserSegment, string> = {
  power: 'Power User',
  active: 'Active',
  at_risk: 'At Risk',
  dormant: 'Dormant',
  new: 'New',
};
const SEGMENT_BADGE_CLASS: Record<UserSegment, string> = {
  power: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  at_risk: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  dormant: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400',
  new: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

function segmentOf(user: UserProfile): UserSegment {
  return 'active'; // Default stub
}

function planOf(user: UserProfile, bizIndex: Map<string, Clinic>): string {
  const clinic = user.clinicId ? bizIndex.get(user.clinicId) : null;
  return clinic?.subscription?.plan || 'free';
}

function UserPresence({ lastSeen, status }: { lastSeen?: any, status?: string }) {
  if (status === 'inactive') return <span className="text-muted-foreground">Inactive</span>;
  const d = toDate(lastSeen);
  if (!d) return <span className="text-muted-foreground">Never</span>;
  return <span>{d.toLocaleDateString()}</span>;
}

const StatTile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card className="p-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold leading-none">{value}</p>
    {hint && <p className="mt-1 truncate text-[10px] text-muted-foreground">{hint}</p>}
  </Card>
);

const COLUMNS = [
  { key: 'user', label: 'User', className: 'min-w-[200px]' },
  { key: 'business', label: 'Clinic', className: 'hidden md:table-cell min-w-[160px]' },
  { key: 'role', label: 'Role', className: 'min-w-[100px]' },
  { key: 'plan', label: 'Plan', className: 'hidden lg:table-cell min-w-[90px]' },
  { key: 'seen', label: 'Last active', className: 'hidden sm:table-cell min-w-[140px]' },
  { key: 'status', label: 'Status', className: 'min-w-[90px]' },
  { key: 'actions', label: '', className: 'w-[80px] text-right' },
];

function UserTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map(c => (
          <TableHead key={c.key} className={c.className}>
            {c.label || <span className="sr-only">Actions</span>}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function UserRowSkeleton() {
  return (
    <TableRow>
      {COLUMNS.map(c => (
        <TableCell key={c.key} className={c.className}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function UsersPage() {
  const { user: currentUser, loading: isProfileLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [userToUpdate, setUserToUpdate] = React.useState<{ user: UserProfile; action: 'activate' | 'deactivate' } | null>(null);

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'active' | 'joined' | 'name'>('active');
  const [isImpersonating, setIsImpersonating] = React.useState(false);
  const [isSendingEmails, setIsSendingEmails] = React.useState(false);

  const handleSendRetentionEmails = async () => {
    if (!currentUser?.uid) return;
    setIsSendingEmails(true);
    toast({ title: 'Sending emails...', description: 'This might take a moment.' });
    try {
      const res = await fetch('/api/admin/send-retention-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: data.message });
      } else {
        throw new Error(data.message || 'Failed to send emails');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleImpersonate = async (targetUid: string) => {
    if (!currentUser?.uid) return;
    setIsImpersonating(true);
    toast({ title: 'Initiating impersonation...', description: 'Please wait.' });
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, targetUid })
      });
      const data = await res.json();
      if (data.success && data.customToken) {
        const auth = getAuth();
        await signInWithCustomToken(auth, data.customToken);
        toast({ title: 'Impersonation successful', description: 'Redirecting to dashboard...' });
        router.push('/dashboard');
      } else {
        throw new Error(data.message || 'Failed to get custom token');
      }
    } catch (error: any) {
      toast({ title: 'Impersonation failed', description: error.message, variant: 'destructive' });
      setIsImpersonating(false);
    }
  };

  const canManageUsers = currentUser?.email === 'belloimam431@gmail.com' || currentUser?.email === 'admin@orelis.app';

  const usersQuery = React.useMemo(() => {
    if (!firestore || !canManageUsers) return null;
    return query(collection(firestore, 'users'));
  }, [canManageUsers, firestore]);
  const { data: users, loading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const businessesQuery = React.useMemo(() => {
    if (!firestore || !canManageUsers) return null;
    return query(collection(firestore, 'clinics'));
  }, [canManageUsers, firestore]);
  const { data: businesses, loading: areBusinessesLoading } = useCollection<Clinic>(businessesQuery);

  const isLoading = isProfileLoading || areUsersLoading || areBusinessesLoading;

  const bizIndex = React.useMemo(() => {
    const map = new Map<string, Clinic>();
    if (businesses) {
      businesses.forEach(b => {
        if (b.id) map.set(b.id, b);
      });
    }
    return map;
  }, [businesses]);

  const summary = React.useMemo(() => {
    const all = users ?? [];
    const registered = all.filter(u => Boolean(u.email || u.name));
    const incomplete = all.filter(u => !u.email && !u.name);
    
    return { 
      total: all.length, 
      registeredCount: registered.length, 
      incompleteCount: incomplete.length,
    };
  }, [users]);

  const visibleUsers = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = (users ?? []).filter(u => {
      if (roleFilter !== 'all' && (u.role || 'doctor') !== roleFilter) return false;
      if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false;

      if (!term) return true;
      const clinic = u.clinicId ? bizIndex.get(u.clinicId) : undefined;
      return (
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (clinic?.name || '').toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.name || 'Unknown').localeCompare(b.name || 'Unknown');
      // For now fallback to simple sort
      return 0; 
    });
  }, [users, bizIndex, search, roleFilter, statusFilter, sortBy]);

  const handleUpdateUserStatus = async () => {
    if (!userToUpdate || !firestore || !userToUpdate.user.id) return;
    const userRef = doc(firestore, 'users', userToUpdate.user.id);
    const newStatus = userToUpdate.action === 'activate' ? 'active' : 'inactive';

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User does not exist.');
        transaction.update(userRef, { status: newStatus });
      });
      toast({ title: `User ${userToUpdate.action}d`, description: `${userToUpdate.user.name}'s account has been ${userToUpdate.action}d.`, variant: 'default' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not update user status.', variant: 'destructive' });
    } finally {
      setUserToUpdate(null);
    }
  };

  const openUser = (id?: string) => {
    if (id) router.push(`/super-admin/users/detail?id=${encodeURIComponent(id)}`);
  };

  return (
    <>
      <div className="grid gap-6">
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Platform Users</CardTitle>
                <CardDescription>
                  Every account on Orelis. Select a user to see their full profile.
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={!visibleUsers.length}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden whitespace-nowrap sm:inline">Export CSV</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!canManageUsers && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Permission Denied</AlertTitle>
                <AlertDescription>
                  You do not have permission to manage users. Please contact the platform administrator.
                </AlertDescription>
              </Alert>
            )}

            {canManageUsers && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="Total accounts" value={summary.total.toLocaleString()} hint={`${summary.registeredCount} registered · ${summary.incompleteCount} visitors`} />
                  <StatTile label="Registered" value={summary.registeredCount.toLocaleString()} />
                  <StatTile label="Incomplete" value={summary.incompleteCount.toLocaleString()} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search name, email, or clinic…"
                      className="h-9 pl-8 text-sm"
                      aria-label="Search users"
                    />
                  </div>
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Last active</SelectItem>
                      <SelectItem value="joined">Date joined</SelectItem>
                      <SelectItem value="name">Name A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing {visibleUsers.length.toLocaleString()} of {summary.total.toLocaleString()} users
                </p>
              </>
            )}

            {isLoading ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <UserTableHeader />
                  <TableBody>
                    <UserRowSkeleton />
                    <UserRowSkeleton />
                    <UserRowSkeleton />
                  </TableBody>
                </Table>
              </div>
            ) : visibleUsers.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <UserTableHeader />
                  <TableBody>
                    {visibleUsers.map((u) => {
                      const clinic = u.clinicId ? bizIndex.get(u.clinicId) : undefined;
                      const segment = segmentOf(u);
                      return (
                        <TableRow
                          key={u.id || u.uid}
                          className="cursor-pointer"
                          onClick={() => openUser(u.id)}
                          tabIndex={0}
                          role="link"
                          aria-label={`Open ${u.name}'s profile`}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUser(u.id); }
                          }}
                        >
                          <TableCell>
                            <div className="font-medium flex items-center gap-1.5">
                              {u.name || clinic?.name || <span className="text-amber-600 dark:text-amber-400 font-semibold">Incomplete Signup</span>}
                            </div>
                            <div className="break-all text-xs text-muted-foreground flex items-center gap-1.5">
                              {u.email || <span className="italic opacity-60">No email provided</span>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{clinic?.name || <span className="text-muted-foreground">—</span>}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={(u.role || 'doctor') === 'admin' ? 'default' : 'secondary'} className="whitespace-nowrap capitalize">
                              {(u.role || 'doctor').replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-xs capitalize">{planOf(u, bizIndex)}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <UserPresence lastSeen={(u as any).lastSeen} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={(u as any).status === 'inactive' ? 'destructive' : 'outline'}
                              className="capitalize"
                            >
                              {u.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    disabled={!canManageUsers || currentUser?.uid === u.uid}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions for {u.name}</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem className="cursor-pointer" onSelect={() => openUser(u.id)}>
                                    <User className="mr-2 h-4 w-4" /> View full profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer" disabled={isImpersonating} onSelect={() => handleImpersonate(u.uid)}>
                                    <UserCheck className="mr-2 h-4 w-4" /> Impersonate user
                                  </DropdownMenuItem>
                                  {(u as any).status === 'inactive' ? (
                                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setUserToUpdate({ user: u, action: 'activate' }); }}>
                                      <UserCheck className="mr-2 h-4 w-4" /> Activate user
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setUserToUpdate({ user: u, action: 'deactivate' }); }}>
                                      <UserX className="mr-2 h-4 w-4" /> Deactivate user
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <User className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">
                  {summary.total > 0 ? 'No users match these filters' : 'No users found'}
                </h3>
                <p className="mb-4 mt-2 text-muted-foreground">
                  Try clearing the search or widening a filter.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!userToUpdate} onOpenChange={(open) => !open && setUserToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
                              {userToUpdate?.action === 'deactivate'
                                ? <>This will mark <strong>{userToUpdate?.user.name}</strong> as inactive, and they will not be able to log in. Their data will be preserved.</>
                : <>This will reactivate <strong>{userToUpdate?.user.name}</strong>'s account, allowing them to log in again.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateUserStatus} className={userToUpdate?.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {userToUpdate?.action === 'deactivate' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
