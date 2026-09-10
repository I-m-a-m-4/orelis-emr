'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Building,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmail, signInWithGoogle } from '@/firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirestore, FirebaseClientProvider } from '@/firebase';
import { updateProfile } from 'firebase/auth';

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

function ClinicSignUpContent() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handlePostRegistration = async (user: any, fallbackName: string) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.role === 'patient') {
        router.push('/dashboard/my-records');
        return;
      }
      if (data.onboardingCompleted && data.clinicId) {
        toast({
          title: 'Welcome Back',
          description: `Logged in as ${data.name || user.displayName || user.email}.`,
        });
        router.push('/dashboard');
        return;
      }
    } else {
      // Create user record with admin role and pending onboarding
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: fallbackName || user.displayName || user.email?.split('@')[0] || 'Administrator',
        role: 'admin',
        status: 'active',
        clinicId: user.uid,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Account Created!',
      description: 'Welcome to Orelis. Let us configure your hospital workspace.',
    });
    router.push('/onboarding');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { user, error } = await signInWithGoogle();
      if (error || !user) {
        if (error && (error as any).code !== 'auth/popup-closed-by-user') {
          toast({
            title: 'Google Sign-In Failed',
            description: error?.message || 'Could not authenticate with Google.',
            variant: 'destructive',
          });
        }
        setIsGoogleLoading(false);
        return;
      }

      await handlePostRegistration(user, user.displayName || '');
    } catch (err: any) {
      toast({
        title: 'Authentication Error',
        description: err.message || 'Could not connect with Google.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name Required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Valid Email Required', description: 'Please enter a valid work email address.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password Too Short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { user, error } = await createUserWithEmail(email.trim(), password);
      if (error || !user) {
        throw new Error(error?.message || 'Could not create account. Email may already be registered.');
      }

      await updateProfile(user, { displayName: name.trim() });
      await handlePostRegistration(user, name.trim());
    } catch (err: any) {
      toast({
        title: 'Registration Error',
        description: err.message || 'Failed to create your account. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25 z-0"
      >
        <source src="/signup-video-page.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 grid-bg z-0" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Stethoscope className="h-9 w-9 text-primary" />
            <span className="text-2xl font-bold text-primary font-headline">Orelis EMR</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Autonomous Clinical Intelligence & Hospital Management</p>
        </div>

        <Card className="bg-card/95 backdrop-blur-md border-border/80 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">Create Clinic Account</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sign up to set up your hospital workspace. No credit card required.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full h-11 border-border/80 bg-background/60 hover:bg-muted/80 gap-3 font-semibold text-xs shadow-sm"
            >
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-dashed border-border" />
              <span className="bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Or with work email
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dr. Fatima Bello"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSubmitting || isGoogleLoading}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Work / Hospital Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="director@apexmedical.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting || isGoogleLoading}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Master Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting || isGoogleLoading}
                    className="pl-9 pr-10 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>You will be assigned the <strong>Clinic Administrator</strong> role.</span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full h-11 button-glow font-semibold gap-2 mt-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                  </>
                ) : (
                  <>
                    Create Account & Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-muted-foreground space-y-2">
              <div>
                Already have an account?{' '}
                <Link href="/login" className="underline font-semibold text-primary hover:text-primary/80">
                  Log in
                </Link>
              </div>
              <div>
                Looking for your personal medical records?{' '}
                <Link href="/signup/patient" className="underline text-muted-foreground hover:text-foreground">
                  Register as a Patient
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClinicSignUpPage() {
  return (
    <FirebaseClientProvider>
      <ClinicSignUpContent />
    </FirebaseClientProvider>
  );
}
