
'use client';
import { useActionState } from 'react';
import { useEffect, useRef, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { addStaffAction, type AddStaffFormState } from '@/app/actions';
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

const initialState: AddStaffFormState = {
  message: '',
  isSuccess: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Staff Member'}
    </Button>
  );
}

export default function AddStaffPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [state, formAction] = useActionState(addStaffAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.isSuccess ? 'Success!' : 'Error!',
        description: state.message,
        variant: state.isSuccess ? 'default' : 'destructive',
      });
      if (state.isSuccess) {
        formRef.current?.reset();
        router.push('/dashboard/staff');
      }
    }
  }, [state, toast, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Add New Staff Member</h1>
      </div>
      <form ref={formRef} action={formAction}>
        {userProfile?.clinicId && <input type="hidden" name="clinicId" value={userProfile.clinicId} />}
        <Card className="border-dashed max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Staff Account</CardTitle>
            <CardDescription>Fill out the form below to create a new account for a staff member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="Dr. John Doe" />
              {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="staff@example.com" />
              {state.errors?.email && <p className="text-sm font-medium text-destructive">{state.errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" />
              {state.errors?.password && <p className="text-sm font-medium text-destructive">{state.errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role">
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {state.errors?.role && <p className="text-sm font-medium text-destructive">{state.errors.role}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <SubmitButton />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
