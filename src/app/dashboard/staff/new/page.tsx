
'use client';
import { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

type FieldErrors = Record<string, string | undefined>;

/**
 * Creating a staff account needs the Admin SDK (an Auth user plus a custom
 * claim), so unlike the clinical forms this one genuinely cannot work offline —
 * it posts to `/api/admin/staff`. `apiFetch` queues it if the network drops
 * mid-request and the replay is idempotent, so a lost connection delays the
 * account rather than creating two.
 */
export default function AddStaffPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [role, setRole] = useState<string>('');

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const validate = (values: Record<string, string>): FieldErrors => {
    const next: FieldErrors = {};
    if (!values.name || values.name.trim().length < 2) next.name = 'Name is required.';
    if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = 'A valid email address is required.';
    }
    if (!values.password || values.password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (!['admin', 'doctor', 'receptionist'].includes(values.role)) {
      next.role = 'Please select a role.';
    }
    if (!values.clinicId) next.clinicId = 'Your clinic could not be determined.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const values = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      role,
      clinicId: userProfile?.clinicId ?? '',
    };

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setPending(true);
    const result = await apiFetch<{ success: boolean; message: string }>(
      '/api/admin/staff',
      {
        method: 'POST',
        body: values,
        description: `Create staff account for ${values.email}`,
      }
    );
    setPending(false);

    if (result.queued) {
      toast({
        title: 'Queued',
        description: 'No connection — the account will be created when you are back online.',
      });
      router.push('/dashboard/staff');
      return;
    }

    if (!result.ok) {
      toast({
        title: 'Error!',
        description: result.error ?? 'Failed to add staff.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success!',
      description: result.data?.message ?? 'Staff member created.',
    });
    form.reset();
    setRole('');
    router.push('/dashboard/staff');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Add New Staff Member</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="border-dashed max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Staff Account</CardTitle>
            <CardDescription>Fill out the form below to create a new account for a staff member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="Dr. John Doe" />
              {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="staff@example.com" />
              {errors.email && <p className="text-sm font-medium text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" />
              {errors.password && <p className="text-sm font-medium text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm font-medium text-destructive">{errors.role}</p>}
            </div>

            {errors.clinicId && <p className="text-sm font-medium text-destructive">{errors.clinicId}</p>}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
