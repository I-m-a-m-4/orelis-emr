// src/app/dashboard/layout.tsx
'use client';
import type { ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { DashboardProvider } from './provider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <DashboardProvider>
        <div className="font-dm-sans min-h-screen">
          {children}
        </div>
      </DashboardProvider>
    </FirebaseClientProvider>
  );
}
