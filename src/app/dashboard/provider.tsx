// src/app/dashboard/provider.tsx
'use client';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import { FloatingAiChat } from '@/components/layout/floating-ai-chat';
import { OfflineSyncProvider } from '@/lib/offline/use-offline-sync';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no user, redirect to login unless on a public-facing page
    if (!loading && !user) {
      // Allow access to login/signup pages without redirecting
      const publicRoutes = ['/login', '/signup', '/signup/clinic', '/signup/patient'];
      if (!publicRoutes.some(route => pathname.startsWith(route))) {
        router.push('/login');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return <LoadingAnimation />;
  }

  return <>{children}</>;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = userLoading || profileLoading;

  useEffect(() => {
    if (isLoading || !userProfile) return;

    // Define restricted routes mapping
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      doctor: [
        '/dashboard',
        '/dashboard/appointments',
        '/dashboard/patients',
        '/dashboard/records',
        '/dashboard/encounters',
        '/dashboard/lab',
        '/dashboard/pharmacy',
        '/dashboard/wards',
        '/dashboard/telehealth',
        '/dashboard/notifications',
        '/dashboard/support',
        '/dashboard/settings',
        '/dashboard/my-records',
        '/dashboard/developers'
      ],
      receptionist: [
        '/dashboard',
        '/dashboard/appointments',
        '/dashboard/patients',
        '/dashboard/waitlist',
        '/dashboard/support',
        '/dashboard/my-records',
        '/dashboard/developers'
      ],
      patient: [
        '/dashboard',
        '/dashboard/appointments',
        '/dashboard/my-records',
        '/dashboard/support'
      ]
    };

    const allowedRoutes = rolePermissions[userProfile.role] || [];
    const isAuthorized = allowedRoutes.includes('*') ||
      allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

    if (!isAuthorized && pathname !== '/dashboard') {
      console.warn(`Unauthorized access attempt to ${pathname} by role ${userProfile.role}`);
      router.replace('/dashboard');
      return;
    }

    // Redirect a patient to link their records if they haven't yet
    if (userProfile.role === 'patient' && !userProfile.patientId && pathname !== '/dashboard/my-records') {
      router.replace('/dashboard/my-records');
    }

  }, [isLoading, userProfile, router, pathname]);

  if (isLoading || !userProfile) {
    return <LoadingAnimation />;
  }

  return (
    <AuthGuard>
      {/*
        Mounted inside the `!userProfile` guard above, so hydration always has a
        clinicId to scope by — it is keyed on that, and starting it before the
        profile resolves would either hydrate nothing or, worse, hydrate against
        a stale clinic. It never blocks this render: the dashboard reads from the
        mirror and from Firestore's own cache, both of which are useful before a
        sync completes and after one fails.
      */}
      <OfflineSyncProvider profile={userProfile}>
        <SidebarProvider>
          <div className="min-h-screen w-full bg-background text-foreground flex">
            <Sidebar collapsible="icon">
              <AppSidebar userProfile={userProfile} isLoading={isLoading} />
            </Sidebar>
            <div className="flex flex-col flex-1 min-w-0">
              <AppHeader />
              <main className="flex-1 p-4 pb-20 md:p-6 lg:p-8 overflow-auto">
                {children}
              </main>
              <MobileNav userProfile={userProfile} isLoading={isLoading} />
            </div>
          </div>
          <FirebaseErrorListener />
          <FloatingAiChat />
        </SidebarProvider>
      </OfflineSyncProvider>
    </AuthGuard>
  );
}
