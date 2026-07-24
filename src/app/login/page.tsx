
'use client';

import Link from "next/link";
import { Stethoscope, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, sendPasswordReset } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { doc, getDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import type { UserProfile } from "@/lib/types";
import { FirebaseClientProvider } from "@/firebase/client-provider";


function ForgotPasswordDialog() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
        const { error } = await sendPasswordReset(email);

        if (error) {
            toast({
                title: 'Error',
                description: 'Could not send password reset email. Please try again.',
                variant: 'destructive',
            });
        } else {
             toast({
                title: 'Check your email',
                description: 'If an account with that email exists, a password reset link has been sent.',
                variant: 'default',
            });
            setOpen(false);
        }
        setIsPending(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button type="button" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handlePasswordReset}>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address below and we'll send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid items-center gap-2">
                            <Label htmlFor="email" className="sr-only">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="email" name="email" type="email" placeholder="m@example.com" required className="pl-9" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                         <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSuccessfulLogin = async (userId: string) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userProfile = userDoc.data() as UserProfile;
      // Check for super admin claim
      // This is a simplified check, a more robust way is to check the ID token claims
      if (userProfile.email === 'bimex4@gmail.com') {
          const idTokenResult = await userDoc.ref.parent.parent?.app.auth().currentUser?.getIdTokenResult(true);
          if (idTokenResult?.claims.superAdmin) {
              router.push('/super-admin');
              return;
          }
      }
      
      if (userProfile.role === 'patient' && !userProfile.patientId) {
        router.push('/dashboard/my-records');
      } else {
        router.push('/dashboard');
      }
    } else {
      // Fallback for users that might not have a profile doc yet
      router.push('/dashboard');
    }
  };


  const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningIn(true);
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
    
    const { user, error } = await signInWithEmail(email, password);

    if (user) {
      await handleSuccessfulLogin(user.uid);
    } else if (error) {
       toast({
          title: "Login Failed",
          description: "The email or password you entered is incorrect. Please try again.",
          variant: "destructive",
        });
    }
    setIsSigningIn(false);
  }

  return (
      <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
         <form onSubmit={handleEmailSignIn}>
          <div className="grid gap-4">
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
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <ForgotPasswordDialog />
              </div>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSigningIn ? 'Logging in...' : 'Login'}
            </Button>
             </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
  )
}

function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto bg-muted/20 border-white/10 shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="grid gap-4">
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

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // A small delay to prevent flickering on fast connections
    const timer = setTimeout(() => setIsLoading(false), 300); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background grid-bg">
      <div className="w-full max-w-md mx-auto p-4">
        <div className="text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
                <Stethoscope className="h-10 w-10 text-primary" />
                <span className="text-3xl font-bold text-primary font-headline">Orelis</span>
            </Link>
        </div>
        {isLoading ? <LoginSkeleton /> : <LoginForm />}
      </div>
    </div>
  );
}


export default function LoginPage() {
    return (
        <FirebaseClientProvider>
            <LoginPageContent />
        </FirebaseClientProvider>
    )
}
