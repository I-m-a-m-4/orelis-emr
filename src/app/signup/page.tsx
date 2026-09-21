import Link from "next/link";
import { Stethoscope, Building2, UserRound } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-2">
        <Stethoscope className="h-10 w-10 text-primary" />
        <span className="text-3xl font-bold text-primary font-headline">Orelis</span>
      </div>

      {/* Header text */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3 font-headline text-foreground">Join Orelis</h1>
        <p className="text-muted-foreground">Choose your account type to get started.</p>
      </div>

      {/* Account Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-12">
        
        {/* Clinic Option */}
        <Link 
          href="/signup/clinic" 
          className="group flex flex-col items-center text-center p-10 rounded-xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
        >
          <div className="mb-4 text-primary">
            <Building2 className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">For my Clinic</h2>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            Manage patients, appointments, and staff for your entire organization.
          </p>
        </Link>

        {/* Patient Option */}
        <Link 
          href="/signup/patient" 
          className="group flex flex-col items-center text-center p-10 rounded-xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
        >
          <div className="mb-4 text-primary">
            <UserRound className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">As a Patient</h2>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            Access your medical records and manage your appointments.
          </p>
        </Link>

      </div>

      {/* Login link */}
      <div className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
