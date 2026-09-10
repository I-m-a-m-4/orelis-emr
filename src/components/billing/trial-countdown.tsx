'use client';

import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Zap, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Clinic } from '@/lib/types';

interface TrialCountdownProps {
  clinic?: Clinic | null;
  onUpgradeClick?: () => void;
}

export default function TrialCountdown({ clinic, onUpgradeClick }: TrialCountdownProps) {
  const sub = clinic?.subscription;
  const expiryDate = sub?.expiryDate ? new Date(sub.expiryDate) : null;
  const trialStartedAt = sub?.trialStartedAt ? new Date(sub.trialStartedAt) : null;

  const totalTrialDays = 30;
  const now = Date.now();
  const expiryTime = expiryDate ? expiryDate.getTime() : now + 30 * 24 * 60 * 60 * 1000;
  const msRemaining = Math.max(0, expiryTime - now);
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));

  const isExpired = sub?.status === 'expired' || msRemaining <= 0;

  // Calculate elapsed progress
  const percentElapsed = isExpired
    ? 100
    : Math.min(100, Math.max(0, Math.round(((totalTrialDays - daysRemaining) / totalTrialDays) * 100)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all',
              isExpired
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-primary/10 border-primary/20 text-primary'
            )}
          >
            {isExpired ? <AlertTriangle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base md:text-lg">
                {isExpired ? 'Pro Trial Expired' : 'Pro Plan 30-Day Free Trial'}
              </h3>
              <Badge
                variant={isExpired ? 'destructive' : 'outline'}
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5',
                  !isExpired && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {isExpired ? 'Read-Only Mode' : `${daysRemaining} Days Left`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isExpired
                ? 'Your complimentary 30-day Pro trial has ended. Clinical operations are currently in read-only mode.'
                : `Enjoy complete unlimited access to all Pro features. ${hoursRemaining} hours remaining in your trial.`}
            </p>
          </div>
        </div>

        {onUpgradeClick && (
          <Button
            size="sm"
            onClick={onUpgradeClick}
            variant={isExpired ? 'default' : 'outline'}
            className="shrink-0 gap-1 font-bold shadow-sm"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            {isExpired ? 'Upgrade Now' : 'Select Paid Plan'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>{isExpired ? 'Trial complete (30 of 30 days used)' : `Day ${Math.max(1, 30 - daysRemaining + 1)} of 30`}</span>
          <span>{isExpired ? 'Expired' : `${daysRemaining} days remaining`}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              isExpired
                ? 'bg-destructive'
                : percentElapsed > 75
                ? 'bg-amber-500'
                : 'bg-primary'
            )}
            style={{ width: `${percentElapsed}%` }}
          />
        </div>
      </div>
    </div>
  );
}
