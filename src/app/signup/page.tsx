
'use client';
import Link from "next/link";
import { Stethoscope, Building, User } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background grid-bg">
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
                <Stethoscope className="h-10 w-10 text-primary" />
                <span className="text-3xl font-bold text-primary font-headline">Orelis</span>
            </Link>
        </div>
        <div className="bg-background/50 border border-dashed border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center p-8">
                <CardTitle className="text-3xl font-headline">Join Orelis</CardTitle>
                <CardDescription className="text-lg text-zinc-400">Choose your account type to get started.</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-dashed border-white/20">
                 <Link href="/signup/clinic" className="p-8 group">
                    <div className="bg-muted/40 group-hover:bg-muted/80 transition-colors h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-transparent group-hover:border-primary">
                        <Building className="h-12 w-12 mb-4 text-primary" />
                        <h3 className="text-xl font-semibold font-headline text-white">For my Clinic</h3>
                        <p className="text-muted-foreground mt-2">Manage patients, appointments, and staff for your entire organization.</p>
                    </div>
                </Link>
                <Link href="/signup/patient" className="p-8 group">
                     <div className="bg-muted/40 group-hover:bg-muted/80 transition-colors h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-transparent group-hover:border-primary">
                        <User className="h-12 w-12 mb-4 text-primary" />
                        <h3 className="text-xl font-semibold font-headline text-white">As a Patient</h3>
                        <p className="text-muted-foreground mt-2">Access your medical records and manage your appointments.</p>
                    </div>
                </Link>
            </div>
             <div className="p-6 border-t border-dashed border-white/20">
                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="underline text-primary/90 hover:text-primary">
                        Log in
                    </Link>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}
