'use client';

import React from 'react';
import { ShieldCheck, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LifetimeAccessStatus() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              Lifetime Access License
            </p>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
              Permanent
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your clinic has permanent unlimited access with no recurring subscription fees or feature limits.
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <Award className="h-4 w-4" /> Infinite Tier
      </div>
    </div>
  );
}
