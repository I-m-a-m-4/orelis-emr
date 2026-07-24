
'use client';

import Link from "next/link";
import { Stethoscope, Loader2, Building, Phone, MapPin, Eye, EyeOff } from "lucide-react";
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
import { useFirestore, useFirebaseApp, FirebaseClientProvider } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import Confetti from "react-confetti";

function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const app = useFirebaseApp();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSuccessfulLogin = (userId: string) => {
    router.push('/dashboard');
  };

  const handleEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !app) {
      toast({ title: "Error", description: "Firebase is not initialized. Please try again.", variant: "destructive" });
      return;
    }
    setIsSigningUp(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const clinicName = formData.get('clinic-name') as string;
    const adminName = formData.get('admin-name') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const country = formData.get('country') as string;
    
    const { user, error } = await createUserWithEmail(email, password);
    
    if (user) {
      try {
        await updateProfile(user, { displayName: adminName });

        // Use the user's UID as the document ID for both the clinic and the user profile for simplicity
        const clinicRef = doc(firestore, 'clinics', user.uid);
        await setDoc(clinicRef, {
            name: clinicName,
            email: email,
            phone: phone,
            address: address,
            country: country,
            subscription: {
              plan: 'trial',
              status: 'trialing',
              expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
            },
        });

        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          name: adminName,
          role: 'admin',
          status: 'active',
          clinicId: clinicRef.id,
        });

        toast({
            title: "Account Created!",
            description: "Your clinic profile has been created.",
        });
        setIsSuccess(true);
        setTimeout(() => handleSuccessfulLogin(user.uid), 3000); // Redirect after confetti

      } catch (firestoreError: any) {
         toast({
            title: "Error setting up profile",
            description: firestoreError.message || "Could not save clinic details. Please check your network and try again.",
            variant: "destructive",
        });
        console.error("Firestore error:", firestoreError);
      }

    } else if (error) {
       toast({
            title: "Sign-up Failed",
            description: error.message || "Could not create account. The email might be in use.",
            variant: "destructive",
        });
    }

    setIsSigningUp(false);
  }

  return (
      <div className="w-full max-w-md mx-auto bg-card border border-border rounded-xl shadow-lg relative">
        {isSuccess && <Confetti recycle={false} onConfettiComplete={() => setIsSuccess(false)} numberOfPieces={400} />}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Create a Clinic Account</CardTitle>
          <CardDescription>Join Orelis to start managing your practice.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignUp} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clinic-name">Clinic Name</Label>
                <Input name="clinic-name" id="clinic-name" placeholder="Sunshine Medical Center" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Your Full Name</Label>
                <Input name="admin-name" id="admin-name" placeholder="Dr. John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Administrator Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@sunshinemedical.com"
                  required
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="phone">Clinic Phone Number</Label>
                <Input name="phone" id="phone" placeholder="+1 (555) 123-4567" required />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="address">Clinic Address</Label>
                <Input name="address" id="address" placeholder="123 Health St, Wellness City" required />
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
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={6}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                </div>
              </div>
              <Button type="submit" className="w-full button-glow" disabled={isSigningUp}>
                {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
          </form>
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
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
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

function ClinicSignUpPageContent() {
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

export default function ClinicSignUpPage() {
    return (
        <FirebaseClientProvider>
            <ClinicSignUpPageContent />
        </FirebaseClientProvider>
    )
}
