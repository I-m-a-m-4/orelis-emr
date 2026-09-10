
'use client';

import Link from "next/link";
import { Stethoscope, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmail, signInWithGoogle } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useFirestore, FirebaseClientProvider } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import Confetti from 'react-confetti';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSuccessfulLogin = (userId: string) => {
    // For new patients, always redirect to link their clinic record
    router.push('/dashboard/my-records');
  };

  const handleGoogleSignIn = async () => {
    if (!firestore) return;
    setIsGoogleLoading(true);
    try {
      const { user, error } = await signInWithGoogle();
      if (error || !user) {
        if (error && (error as any).code !== 'auth/popup-closed-by-user') {
          toast({
            title: "Google Sign-In Failed",
            description: error?.message || "Could not authenticate with Google.",
            variant: "destructive",
          });
        }
        setIsGoogleLoading(false);
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = userDoc.data();
        toast({
          title: "Welcome Back!",
          description: `Logged in as ${profile.name || user.displayName || user.email}.`,
        });
        router.push('/dashboard/my-records');
      } else {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Patient',
          role: 'patient',
          status: 'active',
          country: 'Nigeria',
          createdAt: new Date().toISOString(),
        });
        toast({
          title: "Account Created!",
          description: "Please link your clinic to access your health records.",
        });
        setIsSuccess(true);
        setTimeout(() => handleSuccessfulLogin(user.uid), 2000);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
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
      <div className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl relative z-10">
        {isSuccess && <Confetti recycle={false} onConfettiComplete={() => setIsSuccess(false)} numberOfPieces={400} />}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Create a Patient Account</CardTitle>
          <CardDescription>Sign up to access your health records and appointments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-10 border-border/80 bg-background/60 hover:bg-muted/80 gap-3 font-semibold text-xs shadow-sm"
            >
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-dashed border-border/80" />
              <span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Or with email
              </span>
            </div>

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
            <Button type="submit" className="w-full button-glow" disabled={isSigningUp}>
              {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSigningUp ? 'Creating Account...' : 'Create Account'}
            </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline text-primary">
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
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden py-12">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25 z-0 pointer-events-none"
      >
        <source src="/signup-video-page.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 grid-bg opacity-70 z-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto p-4">
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
