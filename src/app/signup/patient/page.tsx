
'use client';

import Link from "next/link";
import { Stethoscope, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmail } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { useFirestore, FirebaseClientProvider } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import Confetti from 'react-confetti';


function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSuccessfulLogin = (userId: string) => {
    // For new patients, always redirect to link their clinic record
    router.push('/dashboard/my-records');
  };

  const handleEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningUp(true);
    if (!firestore) {
      toast({ title: "Error", description: "Firebase is not initialized.", variant: "destructive" });
      setIsSigningUp(false);
      return;
    }

    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
    const firstName = (e.currentTarget.elements.namedItem('first-name') as HTMLInputElement).value;
    const lastName = (e.currentTarget.elements.namedItem('last-name') as HTMLInputElement).value;
    const country = (e.currentTarget.elements.namedItem('country') as HTMLInputElement).value;
    const fullName = `${firstName} ${lastName}`;

    const { user, error } = await createUserWithEmail(email, password);
    
    if (user) {
      try {
        await updateProfile(user, { displayName: fullName });
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            name: fullName,
            role: 'patient',
            status: 'active',
            country: country,
        });
      
        toast({
            title: "Account Created!",
            description: "Please link your clinic to continue.",
        });
        setIsSuccess(true);
        setTimeout(() => handleSuccessfulLogin(user.uid), 3000);
      } catch (firestoreError: any) {
        toast({
            title: "Error setting up profile",
            description: "Could not save user profile. Please try again.",
            variant: "destructive",
        });
      }
    } else if (error) {
       toast({
            title: "Sign-up Failed",
            description: "Could not create account. The email might be in use or the password is too weak.",
            variant: "destructive",
        });
    }

    setIsSigningUp(false);
  }

  return (
      <div className="w-full max-w-md mx-auto bg-card border border-border rounded-xl shadow-lg relative">
        {isSuccess && <Confetti recycle={false} onConfettiComplete={() => setIsSuccess(false)} numberOfPieces={400} />}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Create a Patient Account</CardTitle>
          <CardDescription>Sign up to access your health records and appointments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form onSubmit={handleEmailSignUp} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" name="first-name" placeholder="John" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" name="last-name" placeholder="Doe" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Select name="country">
                    <SelectTrigger id="country">
                        <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map(country => (
                            <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
               <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningUp}>
              {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSigningUp ? 'Creating Account...' : 'Create Account'}
            </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </div>
  )
}

function SignUpSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-lg shadow-zinc-950/50">
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="grid gap-4">
         <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10" />
            </div>
          </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

function PatientSignUpPageContent() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(timer);
    }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background grid-bg py-12">
      <div className="w-full max-w-md mx-auto p-4">
        <div className="text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
                <Stethoscope className="h-10 w-10 text-primary" />
                <span className="text-3xl font-bold text-primary font-headline">Orelis</span>
            </Link>
        </div>
        {isLoading ? <SignUpSkeleton /> : <SignUpForm />}
      </div>
    </div>
  );
}


export default function PatientSignUpPage() {
    return (
        <FirebaseClientProvider>
            <PatientSignUpPageContent />
        </FirebaseClientProvider>
    )
}
