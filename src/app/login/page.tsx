
'use client';

import Link from "next/link";
import { Stethoscope, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signInWithGoogle, sendPasswordReset } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useFirestore, useAuth } from "@/firebase/provider";
import type { UserProfile } from "@/lib/types";
import { FirebaseClientProvider } from "@/firebase/client-provider";

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
  const auth = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSuccessfulLogin = async (userId: string) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userProfile = userDoc.data() as UserProfile;

      const idTokenResult = await auth?.currentUser?.getIdTokenResult();
      if (idTokenResult?.claims?.superAdmin || (userProfile.role as string) === 'super-admin') {
        router.push('/super-admin');
        return;
      }

      if (userProfile.role === 'patient') {
        router.push(userProfile.patientId ? '/dashboard' : '/dashboard/my-records');
        return;
      }

      // If clinic user has not completed onboarding, route to onboarding!
      if (userProfile.onboardingCompleted === false || !userProfile.clinicId) {
        router.push('/onboarding');
        return;
      }

      router.push('/dashboard');
    } else {
      // First-time sign in via Google through login page
      const currentUser = auth?.currentUser;
      if (currentUser) {
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Administrator',
          role: 'admin',
          status: 'active',
          clinicId: currentUser.uid,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        });
      }
      router.push('/onboarding');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
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
        setIsGoogleSigningIn(false);
        return;
      }

      await handleSuccessfulLogin(user.uid);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not connect with Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleSigningIn(false);
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
      <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-md border-border shadow-xl relative z-10">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              className="w-full h-10 border-border/80 bg-background/60 hover:bg-muted/80 gap-3 font-semibold text-xs shadow-sm"
            >
              {isGoogleSigningIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-dashed border-border/80" />
              <span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Or with credentials
              </span>
            </div>

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
                <Button type="submit" className="w-full button-glow" disabled={isSigningIn}>
                  {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSigningIn ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-primary">
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
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden">
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
