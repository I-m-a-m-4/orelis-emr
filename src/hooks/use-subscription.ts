'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Clinic, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionState {
  clinic: Clinic | null;
  loading: boolean;
  plan: string;
  status: string;
  isLifetime: boolean;
  isTrial: boolean;
  isTrialActive: boolean;
  isActivePaid: boolean;
  isReadOnly: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  totalTrialDays: number;
  expiryDate: Date | null;
  checkReadOnly: (actionName?: string) => boolean;
}

export function useSubscription(): SubscriptionState {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const clinicRef = useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return doc(firestore, 'clinics', userProfile.clinicId);
  }, [userProfile?.clinicId, firestore]);
  const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

  const loading = userLoading || profileLoading || clinicLoading;

  const state = useMemo(() => {
    if (!clinic) {
      return {
        clinic: null,
        loading,
        plan: 'pro',
        status: 'trialing',
        isLifetime: false,
        isTrial: true,
        isTrialActive: true,
        isActivePaid: false,
        isReadOnly: false,
        daysRemaining: 30,
        hoursRemaining: 720,
        totalTrialDays: 30,
        expiryDate: null,
      };
    }

    const sub = clinic.subscription;
    const accessLevel = clinic.accessLevel;

    // Check lifetime license
    const isLifetime =
      accessLevel === 'lifetime' ||
      sub?.plan === 'lifetime' ||
      sub?.plan === 'infinite';

    const plan = sub?.plan || 'pro';
    const status = sub?.status || 'trialing';

    // Parse expiry date
    let expiryDate: Date | null = null;
    if (sub?.expiryDate) {
      const parsed = new Date(sub.expiryDate);
      if (!isNaN(parsed.getTime())) {
        expiryDate = parsed;
      }
    }

    const now = Date.now();
    const expiryTime = expiryDate ? expiryDate.getTime() : 0;
    const timeRemainingMs = expiryTime - now;

    const isExpired = !isLifetime && (status === 'expired' || (expiryDate !== null && timeRemainingMs <= 0));

    const isTrial = status === 'trialing' || (!sub?.status && !isLifetime);
    const isTrialActive = isTrial && (!expiryDate || timeRemainingMs > 0);

    const isActivePaid = !isTrial && status === 'active' && (!expiryDate || timeRemainingMs > 0);

    // Read-only mode engages if the account is neither lifetime, active paid, nor within an active trial
    const isReadOnly = !isLifetime && !isActivePaid && !isTrialActive;

    const daysRemaining = isLifetime
      ? 9999
      : Math.max(0, Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24)));

    const hoursRemaining = isLifetime
      ? 99999
      : Math.max(0, Math.ceil(timeRemainingMs / (1000 * 60 * 60)));

    return {
      clinic,
      loading,
      plan,
      status,
      isLifetime,
      isTrial,
      isTrialActive,
      isActivePaid,
      isReadOnly,
      daysRemaining,
      hoursRemaining,
      totalTrialDays: 30,
      expiryDate,
    };
  }, [clinic, loading]);

  const checkReadOnly = (actionName?: string): boolean => {
    if (state.isReadOnly) {
      toast({
        title: 'Read-Only Mode Active',
        description: `Your 30-day Pro trial has expired. Clinical modifications (${actionName || 'this action'}) are locked. Please upgrade to continue.`,
        variant: 'destructive',
      });
      return true; // blocked
    }
    return false; // allowed
  };

  return {
    ...state,
    checkReadOnly,
  };
}
