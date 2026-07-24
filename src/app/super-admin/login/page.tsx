
'use client';

import Link from "next/link";
import { Stethoscope, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { setSuperAdminClaim } from "@/app/actions";
import { FirebaseClientProvider } from "@/firebase/client-provider";

function SuperAdminLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningIn(true);
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
    
    // Client-side check for immediate feedback
    if (email.toLowerCase() !== 'bimex4@gmail.com') {
      toast({
        title: "Access Denied",
        description: "This login is for super administrators only.",
        variant: "destructive",
      });
      setIsSigningIn(false);
      return;
    }

    const { user, error } = await signInWithEmail(email, password);

    if (user) {
      // The server action will verify the email again before granting the claim.
      const claimResult = await setSuperAdminClaim(user.uid, user.email || '');
      if (claimResult.success) {
        // Force refresh the token to get new claims before redirecting
        await user.getIdToken(true); 
        router.push('/super-admin');
      } else {
        toast({ title: "Claim Failed", description: claimResult.message, variant: "destructive" });
      }
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
      <Card className="w-full max-w-md mx-auto bg-muted/20 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Super Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the super admin dashboard.</CardDescription>
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
                placeholder="superadmin@orelis.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
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
              {isSigningIn ? 'Logging in...' : 'Login as Super Admin'}
            </Button>
             </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Not a super admin?{" "}
            <Link href="/login" className="underline">
              Go to regular login
            </Link>
          </div>
        </CardContent>
      </Card>
  )
}

function SuperAdminLoginContent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background grid-bg">
      <div className="w-full max-w-md mx-auto p-4">
        <div className="text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
                <Stethoscope className="h-10 w-10 text-primary" />
                <span className="text-3xl font-bold text-primary font-headline">Orelis</span>
            </Link>
        </div>
        <SuperAdminLoginForm />
      </div>
    </div>
  );
}


export default function SuperAdminLoginPage() {
  return (
    <FirebaseClientProvider>
      <SuperAdminLoginContent />
    </FirebaseClientProvider>
  )
}
