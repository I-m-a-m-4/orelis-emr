'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Building,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Coins,
  BedDouble,
  Phone,
  Sparkles,
  Layers,
  FileBadge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useFirestore, useUser, FirebaseClientProvider } from '@/firebase';
import { countries } from '@/lib/countries';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import type { UserProfile } from '@/lib/types';

const FACILITY_TYPES = [
  'General Hospital & Multi-Specialty',
  'Private Practice & Outpatient Clinic',
  'Pediatric & Maternity Center',
  'Surgical & Specialist Hospital',
  'Diagnostic & Pathology Center',
  'Dental & Maxillofacial Practice',
  'Community & Primary Healthcare Center',
  'Eye Clinic & Ophthalmology',
];

const FACILITY_SIZES = [
  { label: 'Outpatient / Clinic (1 - 10 Beds)', value: '1-10', defaultBeds: 10 },
  { label: 'Medium Hospital (11 - 50 Beds)', value: '11-50', defaultBeds: 30 },
  { label: 'Large Hospital (51 - 200 Beds)', value: '51-200', defaultBeds: 80 },
  { label: 'Major Medical Center (200+ Beds)', value: '200+', defaultBeds: 250 },
];

const CURRENCY_OPTIONS = [
  { label: 'Nigerian Naira (NGN ₦)', value: 'NGN' },
  { label: 'US Dollar (USD $)', value: 'USD' },
  { label: 'British Pound (GBP £)', value: 'GBP' },
  { label: 'Euro (EUR €)', value: 'EUR' },
  { label: 'Kenyan Shilling (KES)', value: 'KES' },
  { label: 'Ghanaian Cedi (GHS ₵)', value: 'GHS' },
  { label: 'South African Rand (ZAR R)', value: 'ZAR' },
  { label: 'Canadian Dollar (CAD $)', value: 'CAD' },
  { label: 'Australian Dollar (AUD $)', value: 'AUD' },
  { label: 'Indian Rupee (INR ₹)', value: 'INR' },
];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  Nigeria: 'NGN',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Ghana: 'GHS',
  Kenya: 'KES',
  'South Africa': 'ZAR',
  Canada: 'CAD',
  Australia: 'AUD',
  India: 'INR',
  Germany: 'EUR',
  France: 'EUR',
  Ireland: 'EUR',
};

const STEPS = [
  { id: 1, title: 'Hospital Profile', desc: 'Identity & Specialty', icon: Building },
  { id: 2, title: 'Location & Currency', desc: 'Address & Billing', icon: MapPin },
  { id: 3, title: 'Operations & Capacity', desc: 'Beds & Modules', icon: Layers },
];

function OnboardingContent() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [isCheckingProfile, setIsCheckingProfile] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    clinicName: '',
    specialty: 'General Hospital & Multi-Specialty',
    phone: '',
    licenseNumber: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    currency: 'NGN',
    facilitySize: '11-50',
    initializeDefaultWard: true,
  });

  // Verify auth state and existing profile
  React.useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.replace('/signup');
      return;
    }

    const checkExistingProfile = async () => {
      if (!firestore) return;
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          if (profile.role === 'patient') {
            router.replace('/dashboard/my-records');
            return;
          }
          // If already onboarded, send to dashboard!
          if (profile.onboardingCompleted && profile.clinicId) {
            router.replace('/dashboard');
            return;
          }
        }

        // Set default clinic name suggestion from user display name
        if (user.displayName) {
          setFormData((prev) => ({
            ...prev,
            clinicName: prev.clinicName || `${user.displayName}'s Clinic`,
          }));
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkExistingProfile();
  }, [user, userLoading, firestore, router]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'country' && COUNTRY_TO_CURRENCY[value]) {
        next.currency = COUNTRY_TO_CURRENCY[value];
      }
      return next;
    });
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.clinicName.trim()) {
        toast({ title: 'Hospital Name Required', description: 'Please enter your clinic or hospital name.', variant: 'destructive' });
        return false;
      }
      if (!formData.phone.trim()) {
        toast({ title: 'Phone Number Required', description: 'Please enter your hospital frontdesk or emergency phone number.', variant: 'destructive' });
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.address.trim()) {
        toast({ title: 'Address Required', description: 'Please enter your facility street address.', variant: 'destructive' });
        return false;
      }
      if (!formData.city.trim()) {
        toast({ title: 'City Required', description: 'Please enter the city where your clinic is located.', variant: 'destructive' });
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;

    if (!user || !firestore) {
      toast({ title: 'Session Error', description: 'Authentication required. Please sign in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const clinicId = user.uid;

      // 1. Create or Update Clinic Document
      const clinicRef = doc(firestore, 'clinics', clinicId);
      await setDoc(
        clinicRef,
        {
          id: clinicId,
          name: formData.clinicName.trim(),
          specialty: formData.specialty,
          email: user.email || '',
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || null,
          country: formData.country,
          currency: formData.currency,
          facilitySize: formData.facilitySize,
          licenseNumber: formData.licenseNumber.trim() || null,
          ownerId: user.uid,
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subscription: {
            plan: 'pro',
            status: 'trialing',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trialStartedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      // Record initial 30-Day Pro Trial entry in subscription history
      try {
        await addDoc(collection(firestore, 'clinics', clinicId, 'subscription_history'), {
          action: '30-Day Pro Plan Free Trial Activated',
          amount: 0,
          currency: 'NGN',
          plan: 'pro',
          status: 'success',
          timestamp: new Date().toISOString(),
        });
      } catch (histErr) {
        console.warn('Could not record initial trial history:', histErr);
      }

      // 2. Update User Profile Document
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Administrator',
          role: 'admin',
          status: 'active',
          clinicId: clinicId,
          onboardingCompleted: true,
          surveyCompleted: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Initialize Default Ward if enabled
      if (formData.initializeDefaultWard) {
        const sizeConfig = FACILITY_SIZES.find((s) => s.value === formData.facilitySize);
        const bedCount = sizeConfig?.defaultBeds || 20;

        await addDoc(collection(firestore, 'wards'), {
          clinicId: clinicId,
          name: 'General Inpatient Ward',
          type: 'General',
          totalBeds: bedCount,
          createdAt: new Date().toISOString(),
        });
      }

      toast({
        title: 'Hospital Setup Complete!',
        description: `Welcome to Orelis. Launching ${formData.clinicName}...`,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      toast({
        title: 'Setup Error',
        description: err.message || 'Could not complete onboarding. Please check your connection.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  if (userLoading || isCheckingProfile) {
    return <LoadingAnimation />;
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden p-4 md:p-8">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
      >
        <source src="/signup-video-page.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 grid-bg z-0" />

      {isSuccess && (
        <Confetti
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          onConfettiComplete={() => setIsSuccess(false)}
        />
      )}

      <div className="relative z-10 w-full max-w-3xl mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Stethoscope className="h-9 w-9 text-primary" />
            <span className="text-2xl md:text-3xl font-bold text-primary font-headline">Orelis EMR</span>
          </Link>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Welcome, <span className="font-semibold text-foreground">{user?.displayName || user?.email}</span>! Let&apos;s configure your clinical workspace.
          </p>
        </div>

        <Card className="bg-card/95 backdrop-blur-md border-border/80 shadow-2xl overflow-hidden">
          {/* Progress Steps Header */}
          <div className="grid grid-cols-3 border-b border-border/70 bg-muted/20">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;

              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 text-center md:text-left transition-all',
                    isActive && 'bg-primary/10 border-b-2 border-primary',
                    isDone && 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className={cn('text-xs font-bold leading-tight truncate', isActive ? 'text-primary' : 'text-foreground')}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <CardHeader className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl font-headline">
                  {step === 1 && 'Hospital & Practice Details'}
                  {step === 2 && 'Facility Location & Operating Currency'}
                  {step === 3 && 'Capacity & Clinical Configuration'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  {step === 1 && 'Define your medical organization profile and frontdesk contact.'}
                  {step === 2 && 'Set your hospital physical location and default billing currency.'}
                  {step === 3 && 'Configure bed capacity and initial ward provisioning.'}
                </CardDescription>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-muted/50 border border-border text-muted-foreground">
                Step {step} of 3
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* STEP 1: Hospital Profile */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="clinicName" className="text-xs font-semibold">
                    Hospital / Clinic Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="clinicName"
                      placeholder="e.g. St. Jude Specialist Hospital & Diagnostic Center"
                      value={formData.clinicName}
                      onChange={(e) => updateField('clinicName', e.target.value)}
                      required
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty" className="text-xs font-semibold">
                      Facility Type / Specialty
                    </Label>
                    <Select value={formData.specialty} onValueChange={(val) => updateField('specialty', val)}>
                      <SelectTrigger id="specialty" className="h-10 text-xs">
                        <SelectValue placeholder="Select facility type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACILITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Frontdesk / Emergency Phone <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        required
                        className="pl-9 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber" className="text-xs font-semibold">
                    Medical Practice License / Registration Number <span className="text-muted-foreground text-[10px]">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="licenseNumber"
                      placeholder="e.g. MDCN/REG/2024/49102"
                      value={formData.licenseNumber}
                      onChange={(e) => updateField('licenseNumber', e.target.value)}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Appears automatically on prescription headers and clinical invoices.</p>
                </div>
              </div>
            )}

            {/* STEP 2: Location & Currency */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs font-semibold">
                      Country <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.country} onValueChange={(val) => updateField('country', val)}>
                      <SelectTrigger id="country" className="h-10 text-xs">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {countries.map((c) => (
                          <SelectItem key={c.name} value={c.name} className="text-xs">
                            <span className="mr-2 font-mono text-[10px] text-muted-foreground">[{c.code}]</span>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-semibold">
                      Operating Currency <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.currency} onValueChange={(val) => updateField('currency', val)}>
                      <SelectTrigger id="currency" className="h-10 text-xs">
                        <Coins className="h-4 w-4 mr-2 text-primary" />
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-xs font-semibold">
                      State / Province
                    </Label>
                    <Input
                      id="state"
                      placeholder="e.g. Lagos State / Ontario"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Ikeja / Toronto"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      required
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold">
                    Physical Street Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      required
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Capacity & Clinical Operations */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="facilitySize" className="text-xs font-semibold">
                    Facility Size & Inpatient Bed Capacity
                  </Label>
                  <Select value={formData.facilitySize} onValueChange={(val) => updateField('facilitySize', val)}>
                    <SelectTrigger id="facilitySize" className="h-10 text-xs">
                      <BedDouble className="h-4 w-4 mr-2 text-primary" />
                      <SelectValue placeholder="Select facility size" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3.5 rounded-lg border border-border/70 bg-muted/30 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="initWard"
                      checked={formData.initializeDefaultWard}
                      onChange={(e) => updateField('initializeDefaultWard', e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="initWard" className="text-xs font-semibold cursor-pointer">
                      Initialize General Inpatient Ward automatically
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6">
                    Creates an initial general ward configured with{' '}
                    <strong>
                      {FACILITY_SIZES.find((s) => s.value === formData.facilitySize)?.defaultBeds || 20} beds
                    </strong>{' '}
                    so inpatient tracking and bed capacity analytics are ready immediately.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="rounded-lg border border-dashed border-border/80 p-4 bg-card/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Setup Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Hospital Name</span>
                      <span className="font-semibold text-foreground">{formData.clinicName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Specialty</span>
                      <span className="font-semibold text-foreground truncate block">{formData.specialty}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Location</span>
                      <span className="font-semibold text-foreground">{formData.city}, {formData.country}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Currency</span>
                      <span className="font-semibold text-primary">{formData.currency}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Includes full access to AI Consultations, SOAP Charting, Pharmacy, and Telehealth.</span>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border/70">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="gap-2 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
              ) : (
                <div />
              )}

              {step < STEPS.length ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextStep}
                  className="gap-2 text-xs button-glow font-semibold"
                >
                  Next Step <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCompleteOnboarding}
                  disabled={isSubmitting}
                  className="gap-2 text-xs button-glow font-semibold h-10 px-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Clinic...
                    </>
                  ) : (
                    <>
                      Complete Setup & Launch <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <FirebaseClientProvider>
      <OnboardingContent />
    </FirebaseClientProvider>
  );
}
