'use client';

import * as React from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import type { Clinic, Patient, UserProfile, Encounter } from '@/lib/types';
import { Hospital, Users, Stethoscope, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';

// --- Stat Card Helper ---
function MetricStatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  description?: string; 
}) {
  return (
    <Card className="transition-all hover:shadow-lg p-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        <Icon className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-6xl font-black font-mono tracking-tighter text-foreground mb-3">{value}</div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function useCollectionCount(path: string): number | null {
    const firestore = useFirestore();
    const [total, setTotal] = useState<number | null>(null);

    useEffect(() => {
        if (!firestore) return;
        let cancelled = false;

        getCountFromServer(collection(firestore as any, path))
            .then(snap => { if (!cancelled) setTotal(snap.data().count); })
            .catch(() => { /* fallback */ });

        return () => { cancelled = true; };
    }, [firestore, path]);

    return total;
}

export default function AdminDashboard() {
    const firestore = useFirestore();

    const clinicsQuery = useMemo(() => firestore ? query(collection(firestore, 'clinics')) : null, [firestore]);
    const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);

    const { data: clinics, loading: areClinicsLoading } = useCollection<Clinic>(clinicsQuery);
    const { data: users, loading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
    
    const totalClinics = useCollectionCount('clinics') ?? (clinics?.length || 0);
    const totalUsers = useCollectionCount('users') ?? (users?.length || 0);
    const totalPatients = useCollectionCount('patients') ?? 0;
    const totalEncounters = useCollectionCount('encounters') ?? 0;

    const isLoading = areClinicsLoading || areUsersLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center">
                    <Activity className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground font-medium">Loading Orelis Metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                    Orelis Super Admin
                </h1>
                <p className="text-muted-foreground text-lg">
                    Real-time metrics for Clinics, Patients, and Encounters.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricStatCard
                    title="Total Clinics"
                    value={totalClinics.toLocaleString()}
                    icon={Hospital}
                    description="Registered clinics on platform"
                />
                <MetricStatCard
                    title="Total Patients"
                    value={totalPatients.toLocaleString()}
                    icon={Users}
                    description="Patients across all clinics"
                />
                <MetricStatCard
                    title="Total Encounters"
                    value={totalEncounters.toLocaleString()}
                    icon={Stethoscope}
                    description="Completed and pending encounters"
                />
                <MetricStatCard
                    title="Total Staff Users"
                    value={totalUsers.toLocaleString()}
                    icon={FileText}
                    description="Doctors, nurses, receptionists"
                />
            </div>

            <div className="mt-12 bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-2xl font-bold mb-4">Platform Overview</h2>
                <p className="text-muted-foreground">
                    This dashboard has been stripped of missing Zeneva components to ensure compilation.
                    The raw data represents the actual connected Orelis collections (Clinics, Patients, Encounters).
                </p>
            </div>
        </div>
    );
}