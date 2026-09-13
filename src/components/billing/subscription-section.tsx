'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { Check, ShieldCheck, Zap, Building2, Crown, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaystackButton } from '@/components/paystack-button';
import type { Clinic, UserProfile } from '@/lib/types';

interface SubscriptionSectionProps {
  userProfile: UserProfile;
  clinic: Clinic;
  onPaymentSuccess?: () => void;
}

const BILLING_CYCLES = [
  { label: '1 Month', months: 1, discount: 0 },
  { label: '3 Months', months: 3, discount: 0.05 },
  { label: '6 Months', months: 6, discount: 0.10 },
  { label: '1 Year', months: 12, discount: 0.15 },
];

const PLANS = [
  {
    id: 'pro',
    name: 'Orelis Independent Practice',
    tagline: 'Complete medical suite with 30-day trial for every practice',
    monthlyPrice: 20000,
    icon: Zap,
    popular: true,
    features: [
      '30-day complimentary free trial on signup',
      'Unlimited Patient Registrations & Records',
      'AI-Powered SOAP Consultation Charting',
      'Prescription & Pharmacy Inventory Tracking',
      'Laboratory Investigation Orders & Results',
      'Inpatient Ward & Bed Capacity Tracking',
      'Staff Role Management (Doctor, Nurse, Receptionist)',
    ],
  },
  {
    id: 'hospital',
    name: 'Orelis Enterprise Hospital',
    tagline: 'Multi-department tier for full-service hospitals',
    monthlyPrice: 50000,
    icon: Building2,
    popular: false,
    features: [
      'Everything in the Independent Practice Plan',
      'Multi-Ward & ICU Real-time Bed Allocation',
      'Integrated Telehealth Video Consultations',
      'Patient Invoicing & Automated Billing Engine',
      'Longitudinal Risk Radar & Analytics Dashboard',
      'Priority 24/7 Dedicated Support & SLA Guarantee',
      'Custom Medical Report Layouts & Exports',
    ],
  },
];

export function SubscriptionSection({
  userProfile,
  clinic,
  onPaymentSuccess,
}: SubscriptionSectionProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [cycleIndex, setCycleIndex] = useState(0);
  const cycle = BILLING_CYCLES[cycleIndex];

  const currentPlanId = clinic.subscription?.plan || 'pro';
  const isCurrentlyActive = clinic.subscription?.status === 'active';
  const isLifetime =
    clinic.accessLevel === 'lifetime' ||
    clinic.subscription?.plan === 'lifetime' ||
    clinic.subscription?.plan === 'infinite';

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    currentPlanId === 'hospital' ? 'hospital' : 'pro'
  );

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[0];

  // Calculate discounted total
  const rawTotal = selectedPlan.monthlyPrice * cycle.months;
  const payAmount = Math.round(rawTotal * (1 - cycle.discount));

  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const paystackConfig = {
    publicKey: paystackKey,
    email: userProfile.email || '',
    amount: payAmount * 100, // in kobo
    reference: `orelis_${clinic.id || 'sub'}_${Date.now()}`,
    currency: 'NGN',
    metadata: {
      clinicId: clinic.id,
      clinicName: clinic.name,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      billingCycleMonths: cycle.months,
    },
  };

  const handlePaystackSuccess = async (response: any) => {
    if (!firestore || !clinic.id) return;

    try {
      // Calculate new expiry date (extend from current expiry if still valid, or from now)
      const now = Date.now();
      const existingExpiry = clinic.subscription?.expiryDate
        ? new Date(clinic.subscription.expiryDate).getTime()
        : 0;
      const baseTime = existingExpiry > now ? existingExpiry : now;
      const additionalMs = cycle.months * 30 * 24 * 60 * 60 * 1000;
      const newExpiryDate = new Date(baseTime + additionalMs).toISOString();

      // 1. Update clinic subscription document
      const clinicRef = doc(firestore, 'clinics', clinic.id);
      await updateDoc(clinicRef, {
        subscription: {
          plan: selectedPlan.id,
          status: 'active',
          billingCycle: cycle.months,
          expiryDate: newExpiryDate,
          updatedAt: new Date().toISOString(),
        },
      });

      // 2. Record transaction in subscription_history subcollection
      const historyRef = collection(firestore, 'clinics', clinic.id, 'subscription_history');
      await addDoc(historyRef, {
        action: `${selectedPlan.name} Subscription (${cycle.label})`,
        amount: payAmount,
        currency: 'NGN',
        plan: selectedPlan.id,
        billingCycle: cycle.months,
        reference: response.reference || response.trans || `REF-${Date.now()}`,
        status: 'success',
        timestamp: new Date().toISOString(),
      });

      toast({
        title: 'Subscription Activated',
        description: `Your clinic is now on the ${selectedPlan.name} plan for ${cycle.label}.`,
      });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      console.error('Subscription update error:', err);
      toast({
        title: 'Subscription Error',
        description: 'Payment was received, but updating your record failed. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60">
        <div>
          <h3 className="font-bold text-sm">Choose Your Billing Cycle</h3>
          <p className="text-xs text-muted-foreground">Select a longer billing cycle to receive exclusive multi-month discounts.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border">
          {BILLING_CYCLES.map((c, idx) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCycleIndex(idx)}
              className={cn(
                'relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                cycleIndex === idx
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {c.label}
              {c.discount > 0 && (
                <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  -{c.discount * 100}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlanId === plan.id;
          const isCurrentActive = isCurrentlyActive && currentPlanId === plan.id;
          const totalForCycle = Math.round(plan.monthlyPrice * cycle.months * (1 - cycle.discount));

          return (
            <div
              key={plan.id}
              onClick={() => !isLifetime && setSelectedPlanId(plan.id)}
              className={cn(
                'relative flex flex-col justify-between rounded-2xl border p-6 transition-all cursor-pointer',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02] shadow-lg'
                  : 'border-border/70 hover:border-primary/40 bg-card',
                isCurrentActive && 'bg-muted/30'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6">
                  <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              {isCurrentActive && (
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Current Active Plan
                  </Badge>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price Display */}
                <div className="my-5 p-4 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-black">
                      ₦{totalForCycle.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      / {cycle.months === 1 ? 'month' : `${cycle.months} months`}
                    </span>
                  </div>
                  {cycle.discount > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      Includes {cycle.discount * 100}% discount compared to monthly billing
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included Features
                  </p>
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t">
                {isLifetime ? (
                  <Button disabled variant="outline" className="w-full">
                    Lifetime Unlimited Access
                  </Button>
                ) : isSelected ? (
                  <PaystackButton
                    config={paystackConfig}
                    text={`Subscribe with Paystack (₦${payAmount.toLocaleString()})`}
                    onSuccess={handlePaystackSuccess}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-bold"
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    Select {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>Payments are securely encrypted and processed by Paystack. Cancel or adjust cycles at any time.</span>
      </div>
    </div>
  );
}

export default SubscriptionSection;
