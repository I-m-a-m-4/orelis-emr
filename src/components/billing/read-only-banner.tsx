'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';
import { usePathname } from 'next/navigation';

export default function ReadOnlyBanner() {
  const { isReadOnly, loading } = useSubscription();
  const pathname = usePathname();

  if (loading || !isReadOnly) {
    return null;
  }

  // Don't show redundant banner on the billing page itself if preferred, or show a streamlined version
  const isBillingPage = pathname === '/dashboard/billing';

  return (
    <div className="border-b border-rose-900/30 bg-rose-950/90 text-rose-100 px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 border border-rose-500/30">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-bold tracking-wider uppercase text-[11px] bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded border border-rose-500/30 mr-2">
              Read-Only Mode
            </span>
            <span className="font-normal text-rose-200">
              Your 30-day Pro trial has expired. Clinical operations and charting are currently restricted to read-only.
            </span>
          </div>
        </div>

        {!isBillingPage && (
          <Button
            size="sm"
            asChild
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0 shadow-sm gap-1.5 text-xs h-8"
          >
            <Link href="/dashboard/billing">
              Upgrade Subscription
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
