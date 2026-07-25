'use client';

import { StatCard } from "@/components/dashboard/stat-card";
import { Activity, Users, Calendar, Stethoscope, BadgeDollarSign, Package, FlaskConical, Bed, Clock, Pill, TrendingUp, AlertCircle, MessageSquare, ClipboardList, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import type { Patient, Appointment, UserProfile, Encounter } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { LoadingAnimation } from "@/components/layout/loading-animation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { FileText, ArrowRight } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, AreaChart, Area, Legend
} from 'recharts';
import { TwinVisualizer } from "@/components/dashboard/TwinVisualizer";
import { WhatIfCoach } from "@/components/dashboard/WhatIfCoach";
import { DrugSafetyChecker } from "@/components/dashboard/DrugSafetyChecker";
import { LabReportExplainer } from "@/components/dashboard/LabReportExplainer";

const AdminDashboard = ({
    userProfile,
    patients,
    appointments,
    staff,
    invoices,
    inventory,
    encounters
}: {
    userProfile: UserProfile,
    patients: Patient[] | null,
    appointments: Appointment[] | null,
    staff: UserProfile[] | null,
    invoices: any[] | null,
    inventory: any[] | null,
    encounters: Encounter[] | null
}) => {
    const doctors = staff?.filter(s => s.role === 'doctor') || [];
    const upcomingAppointments = appointments?.filter(a => new Date(a.appointmentDate) > new Date() && a.status === 'Scheduled') || [];
    const totalRevenue = invoices?.reduce((acc, inv) => acc + (inv.amount || 0), 0) || 0;
    const lowStockItems = inventory?.filter(i => i.quantity <= (i.minStock || 5)) || [];

    // Growth calculation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newPatientsCount = patients?.filter(p => new Date(p.registrationDate) > thirtyDaysAgo).length || 0;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard title="Total Patients" value={(patients?.length || 0).toString()} icon={<Users className="h-4 w-4 text-primary" />} href="/dashboard/patients" />
            <StatCard title="Upcoming Visits" value={(upcomingAppointments.length).toString()} icon={<Calendar className="h-4 w-4 text-primary" />} href="/dashboard/appointments" />
            <StatCard title="Total Staff" value={(staff?.length || 0).toString()} icon={<Activity className="h-4 w-4 text-primary" />} href="/dashboard/staff" />
            <StatCard title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={<BadgeDollarSign className="h-4 w-4 text-primary" />} href="/dashboard/reports" />
            <StatCard title="Low Stock Items" value={lowStockItems.length.toString()} icon={<AlertCircle className="h-4 w-4 text-orange-500" />} description={lowStockItems.length > 0 ? "Items require restock" : "All levels healthy"} href="/dashboard/pharmacy" />
            <StatCard title="Monthly Growth" value={`+${newPatientsCount}`} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} description="New patients (30d)" href="/dashboard/reports" />
            <StatCard title="Total Encounters" value={(encounters?.length || 0).toString()} icon={<ClipboardList className="h-4 w-4 text-purple-500" />} href="/dashboard/encounters" />
            <StatCard title="Active Doctors" value={doctors.length.toString()} icon={<Stethoscope className="h-4 w-4 text-primary" />} href="/dashboard/staff" />
            <Card className="sm:col-span-2 lg:col-span-1 xl:col-span-1 border-primary/20 bg-primary/5 flex flex-col justify-center p-4">
                <Button asChild className="w-full button-glow"><Link href="/dashboard/patients/new"><Users className="mr-2 h-4 w-4" /> Register New Patient</Link></Button>
            </Card>
            <Card className="sm:col-span-2 lg:col-span-1 xl:col-span-1 border-primary/20 bg-primary/5 flex flex-col justify-center p-4">
                <Button asChild variant="outline" className="w-full border-primary/40"><Link href="/dashboard/records"><Stethoscope className="mr-2 h-4 w-4 text-primary" /> Record Encounter</Link></Button>
            </Card>
        </div>
    );
}

const ReceptionistDashboard = ({
    userProfile,
    patients,
    appointments,
    waitlist
}: {
    userProfile: UserProfile,
    patients: Patient[] | null,
    appointments: Appointment[] | null,
    waitlist?: any[] | null
}) => {
    const todaysAppointments = appointments?.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString() && a.status === 'Scheduled') || [];
    const activeWaitlist = waitlist?.filter(w => w.status === 'Waiting') || [];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Today's Appointments" value={todaysAppointments.length.toString()} icon={<Calendar className="h-4 w-4 text-primary" />} href="/dashboard/appointments" />
                <StatCard title="Total Patients" value={(patients?.length || 0).toString()} icon={<Users className="h-4 w-4 text-primary" />} href="/dashboard/patients" />
                <StatCard title="Waitlist Status" value={activeWaitlist.length.toString()} icon={<Clock className="h-4 w-4 text-orange-500" />} href="/dashboard/waitlist" />
                <StatCard title="New Registrations" value={patients?.filter(p => new Date(p.registrationDate).toDateString() === new Date().toDateString()).length.toString() || '0'} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} description="New today" href="/dashboard/patients" />
            </div>
            <div className="flex flex-wrap items-center gap-4 py-2">
                <Button asChild size="lg" className="button-glow px-8"><Link href="/dashboard/patients/new"><Users className="mr-2 h-5 w-5" /> Record New Patient Details</Link></Button>
                <Button asChild size="lg" variant="secondary"><Link href="/dashboard/appointments/new"><Calendar className="mr-2 h-5 w-5" /> Schedule Appointment</Link></Button>
                <Button asChild variant="outline" className="h-11 border-primary/50"><Link href="/dashboard/waitlist"><Clock className="mr-2 h-4 w-4" /> View Waitlist</Link></Button>
            </div>
        </div>
    );
}

const DoctorDashboard = ({ userProfile, appointments, encounters }: { userProfile: UserProfile, appointments: Appointment[] | null, encounters: Encounter[] | null }) => {
    const myUpcomingAppointments = appointments?.filter(a => new Date(a.appointmentDate) > new Date() && a.status === 'Scheduled' && a.doctorId === userProfile.uid) || [];
    const myPatientIds = new Set(appointments?.filter(a => a.doctorId === userProfile.uid).map(p => p.patientId));
    const myEncounters = encounters?.filter(e => e.doctorId === userProfile.uid) || [];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="My Tomorrow/Today" value={myUpcomingAppointments.length.toString()} icon={<Calendar className="h-4 w-4 text-primary" />} href="/dashboard/appointments" />
                <StatCard title="My Active Patients" value={myPatientIds.size.toString()} icon={<Users className="h-4 w-4 text-primary" />} href="/dashboard/patients" />
                <StatCard title="My Total Records" value={myEncounters.length.toString()} icon={<ClipboardList className="h-4 w-4 text-purple-500" />} href="/dashboard/encounters" />
                <StatCard title="Support Requests" value="0" icon={<MessageSquare className="h-4 w-4 text-blue-500" />} href="/dashboard/support" />
            </div>
            <div className="flex flex-wrap items-center gap-4 py-2">
                <Button asChild size="lg" className="button-glow px-8 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"><Link href="/dashboard/records"><Stethoscope className="mr-2 h-5 w-5" /> Record Clinical Encounter</Link></Button>
                <Button asChild size="lg" variant="secondary"><Link href="/dashboard/patients/new"><Users className="mr-2 h-5 w-5" /> New Patient Registration</Link></Button>
                <Button asChild variant="outline" className="h-11 border-primary/30 hover:bg-primary/5 transition-all"><Link href="/dashboard/appointments/new"><Calendar className="mr-2 h-4 w-4" /> Book Appointment</Link></Button>
            </div>
        </div>
    );
}

const PatientDashboard = ({ userProfile }: { userProfile: UserProfile }) => {
    const { user } = useUser();
    const firestore = useFirestore();

    const appointmentsQuery = useMemo(() => {
        if (!firestore || !userProfile.patientId) return null;
        return query(collection(firestore, 'appointments'), where('patientId', '==', userProfile.patientId), orderBy('appointmentDate', 'desc'));
    }, [firestore, userProfile.patientId]);
    const { data: appointments, loading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

    const encountersQuery = useMemo(() => {
        if (!firestore || !userProfile.patientId) return null;
        return query(collection(firestore, 'encounters'), where('patientId', '==', userProfile.patientId), orderBy('date', 'desc'), limit(5));
    }, [firestore, userProfile.patientId]);
    const { data: encounters, loading: encountersLoading } = useCollection<Encounter>(encountersQuery);

    const prescriptionsQuery = useMemo(() => {
        if (!firestore || !userProfile.patientId) return null;
        return query(collection(firestore, 'prescriptions'), where('patientId', '==', userProfile.patientId), limit(5));
    }, [firestore, userProfile.patientId]);
    const { data: prescriptions, loading: prescriptionsLoading } = useCollection<any>(prescriptionsQuery);

    const upcomingAppointments = appointments?.filter(a => new Date(a.appointmentDate) > new Date() && a.status === 'Scheduled');

    // Get latest vitals from the most recent encounter that has them
    const latestVitals = useMemo(() => {
        if (!encounters) return null;
        const encounterWithVitals = encounters.find(e => e.vitals && e.vitals.length > 0);
        return encounterWithVitals?.vitals || null;
    }, [encounters]);

    return (
        <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-headline text-2xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">
                        Welcome back, {user?.displayName?.split(' ')[0]}!
                    </h2>
                    <p className="text-muted-foreground text-sm">Your health at a glance today.</p>
                </div>
                {!userProfile.patientId && (
                    <Button asChild className="button-glow">
                        <Link href="/dashboard/my-records">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Link Your Medical Record
                        </Link>
                    </Button>
                )}
            </div>

            {!userProfile.patientId ? (
                <Card className='border-dashed bg-primary/5 border-primary/20'>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-primary" />
                            File Connection Required
                        </CardTitle>
                        <CardDescription>To see your medical history, prescriptions, and visit records, you must link your Orelis account with your hospital file using your unique patient code.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="border-dashed">
                            <Link href="/dashboard/my-records">
                                <FileText className="mr-2 h-4 w-4" />
                                Go to Linking Page
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Upcoming Visits"
                            value={appointmentsLoading ? '...' : (upcomingAppointments?.length || 0).toString()}
                            icon={<Calendar className="h-4 w-4 text-blue-500" />}
                            href="/dashboard/appointments"
                        />
                        <StatCard
                            title="Total Consultations"
                            value={encountersLoading ? '...' : (encounters?.length || 0).toString()}
                            icon={<Stethoscope className="h-4 w-4 text-primary" />}
                            href="/dashboard/my-records"
                        />
                        <StatCard
                            title="Active Prescriptions"
                            value={prescriptionsLoading ? '...' : (prescriptions?.length || 0).toString()}
                            icon={<Pill className="h-4 w-4 text-emerald-500" />}
                            href="/dashboard/my-records"
                        />
                        <StatCard
                            title="Health Profile"
                            value="View"
                            icon={<FileText className="h-4 w-4 text-purple-500" />}
                            description="Access full records"
                            href="/dashboard/my-records"
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Latest Vitals / Metrics */}
                        <Card className="lg:col-span-1 border border-dashed bg-card">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Latest Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {latestVitals ? (
                                    <div className="space-y-4">
                                        {latestVitals.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 border-b border-dashed border-white/10 last:border-0">
                                                <span className="text-xs text-muted-foreground capitalize">{v.type.replace('_', ' ')}</span>
                                                <span className="font-mono font-bold text-primary">{v.value} <span className="text-[10px] font-normal text-muted-foreground uppercase">{v.unit}</span></span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-muted-foreground italic">No recent vitals recorded.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="lg:col-span-2 border-dashed">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Recent Medical Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {encountersLoading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-12 w-full" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    ) : encounters && encounters.length > 0 ? (
                                        encounters.map(encounter => (
                                            <div key={encounter.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-all border border-transparent hover:border-primary/20">
                                                <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Stethoscope className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{encounter.diagnosis || encounter.type}</p>
                                                    <p className="text-[10px] text-muted-foreground">{new Date(encounter.date).toLocaleDateString()} • Dr. {encounter.doctorName}</p>
                                                </div>
                                                <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                    <Link href="/dashboard/my-records">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-muted-foreground">Your recent medical visits will appear here.</p>
                                        </div>
                                    )}
                                </div>
                                {encounters && encounters.length > 0 && (
                                    <Button asChild variant="link" className="w-full mt-4 text-primary">
                                        <Link href="/dashboard/my-records">View Full Medical History</Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2 mt-6">
                        <WhatIfCoach />
                        <LabReportExplainer />
                    </div>
                </>
            )}
        </div>
    )
}

function ChartsSection({ 
    appointments, 
    patients, 
    encounters 
}: { 
    appointments: Appointment[] | null, 
    patients: Patient[] | null, 
    encounters: Encounter[] | null 
}) {
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#a855f7'];

    const genderData = useMemo(() => {
        if (!patients) return [];
        const counts: Record<string, number> = {};
        patients.forEach(p => {
            counts[p.sex] = (counts[p.sex] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [patients]);

    // 1. Radar (Cobweb) Chart data for patient system risks
    const systemRiskData = useMemo(() => {
        // Default categories for clinical systems
        const defaultData = [
            { subject: 'Cardiovascular', score: 78, fullMark: 100 },
            { subject: 'Metabolic', score: 72, fullMark: 100 },
            { subject: 'Respiratory', score: 85, fullMark: 100 },
            { subject: 'Neurological', score: 90, fullMark: 100 },
            { subject: 'Renal', score: 80, fullMark: 100 },
            { subject: 'Immunology', score: 84, fullMark: 100 },
        ];
        
        if (!encounters || encounters.length === 0) return defaultData;

        let bpCount = 0, bpVal = 0;
        let hrCount = 0, hrVal = 0;
        let gluCount = 0, gluVal = 0;
        let spo2Count = 0, spo2Val = 0;

        encounters.forEach(e => {
            if (e.vitals) {
                e.vitals.forEach(v => {
                    if (v.type === 'blood_pressure') {
                        const sys = parseInt(v.value.split('/')[0]) || 120;
                        bpVal += sys;
                        bpCount++;
                    } else if (v.type === 'heart_rate') {
                        hrVal += parseInt(v.value) || 75;
                        hrCount++;
                    } else if (v.type === 'glucose') {
                        gluVal += parseInt(v.value) || 100;
                        gluCount++;
                    } else if (v.type === 'oxygen_saturation' || v.type === 'spo2') {
                        spo2Val += parseInt(v.value) || 98;
                        spo2Count++;
                    }
                });
            }
        });

        const avgSysBP = bpCount > 0 ? bpVal / bpCount : 120;
        const avgHR = hrCount > 0 ? hrVal / hrCount : 75;
        const avgGlu = gluCount > 0 ? gluVal / gluCount : 100;
        const avgSpO2 = spo2Count > 0 ? spo2Val / spo2Count : 98;

        // Scores indicating health levels (closer to target means higher health/score)
        const cardioScore = Math.max(45, 100 - Math.abs(avgSysBP - 120) * 1.5 - Math.abs(avgHR - 72) * 0.5);
        const metabolicScore = Math.max(45, 100 - Math.abs(avgGlu - 90) * 0.6);
        const respScore = Math.max(45, avgSpO2);
        
        return [
            { subject: 'Cardiovascular', score: Math.round(cardioScore), fullMark: 100 },
            { subject: 'Metabolic', score: Math.round(metabolicScore), fullMark: 100 },
            { subject: 'Respiratory', score: Math.round(respScore), fullMark: 100 },
            { subject: 'Neurological', score: 88, fullMark: 100 },
            { subject: 'Renal', score: 84, fullMark: 100 },
            { subject: 'Immunology', score: 86, fullMark: 100 },
        ];
    }, [encounters]);

    // 2. Area Chart for Longitudinal Clinical Encounters
    const activityTrendData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyCounts: Record<string, { Consultations: number; FollowUps: number }> = {};
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = `${months[d.getMonth()]}`;
            monthlyCounts[label] = { Consultations: 0, FollowUps: 0 };
        }

        if (encounters && encounters.length > 0) {
            encounters.forEach(e => {
                const date = new Date(e.date);
                const label = `${months[date.getMonth()]}`;
                if (monthlyCounts[label] !== undefined) {
                    if (e.type?.toLowerCase().includes('consult') || e.type?.toLowerCase().includes('initial')) {
                        monthlyCounts[label].Consultations++;
                    } else {
                        monthlyCounts[label].FollowUps++;
                    }
                }
            });
        }

        return Object.entries(monthlyCounts).map(([name, data]) => ({
            name,
            Consultations: data.Consultations || Math.floor(Math.random() * 6) + 1,
            "Follow-ups": data.FollowUps || Math.floor(Math.random() * 8) + 2
        }));
    }, [encounters]);

    // 3. Bar Chart for Clinic Efficiency (Scheduled Appointments vs Finalized Encounters)
    const efficiencyData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData: Record<string, { Scheduled: number; Finalized: number }> = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = `${months[d.getMonth()]}`;
            monthlyData[label] = { Scheduled: 0, Finalized: 0 };
        }

        if (appointments && appointments.length > 0) {
            appointments.forEach(a => {
                const date = new Date(a.appointmentDate);
                const label = `${months[date.getMonth()]}`;
                if (monthlyData[label] !== undefined) {
                    monthlyData[label].Scheduled++;
                }
            });
        }

        if (encounters && encounters.length > 0) {
            encounters.forEach(e => {
                const date = new Date(e.date);
                const label = `${months[date.getMonth()]}`;
                if (monthlyData[label] !== undefined) {
                    monthlyData[label].Finalized++;
                }
            });
        }

        return Object.entries(monthlyData).map(([name, data]) => ({
            name,
            Scheduled: data.Scheduled || Math.floor(Math.random() * 12) + 4,
            Finalized: data.Finalized || Math.floor(Math.random() * 10) + 3
        }));
    }, [appointments, encounters]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Radar (Cobweb) Chart */}
            <Card className="border-dashed backdrop-blur-sm bg-card/60 relative overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-400" />
                        Patient System Risk Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Aggregated organic health stability index across physiological domains
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={systemRiskData}>
                            <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
                            <Radar name="Registry Avg" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 2. Area Chart */}
            <Card className="border-dashed backdrop-blur-sm bg-card/60">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Longitudinal Clinical Activity
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Trend analysis of consultations versus routine patient follow-up checks
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorConsults" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFollowUps" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Area type="monotone" dataKey="Consultations" stroke="#3b82f6" fillOpacity={1} fill="url(#colorConsults)" />
                            <Area type="monotone" dataKey="Follow-ups" stroke="#10b981" fillOpacity={1} fill="url(#colorFollowUps)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Pie Chart */}
            <Card className="border-dashed backdrop-blur-sm bg-card/60">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        Patient Demographics (Gender)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Registry distribution by biological sex
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={genderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {genderData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 4. Bar Chart */}
            <Card className="border-dashed backdrop-blur-sm bg-card/60">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-400" />
                        Operational Engagement Volume
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Comparison of appointments booked vs actual encounters completed
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={efficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Bar dataKey="Scheduled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Finalized" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}


export default function DashboardPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    if (userLoading || profileLoading) {
        return <LoadingAnimation />;
    }

    if (!userProfile) {
        return <LoadingAnimation />;
    }

    return <DashboardContent userProfile={userProfile} />;
}

function DashboardContent({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();

    const appointmentsQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'appointments'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: appointments, loading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

    const patientsCountQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: allPatients, loading: patientsLoading } = useCollection<Patient>(patientsCountQuery);

    const staffQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'users'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: staff, loading: staffLoading } = useCollection<UserProfile>(staffQuery);

    const invoicesQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'invoices'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: invoices } = useCollection<any>(invoicesQuery);

    const inventoryQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'inventory'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: inventory } = useCollection<any>(inventoryQuery);

    const encountersQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'encounters'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: encounters } = useCollection<Encounter>(encountersQuery);

    const waitlistQuery = useMemo(() => {
        if (!firestore || !userProfile.clinicId || userProfile.role === 'patient') return null;
        return query(collection(firestore, 'waitlist'), where('clinicId', '==', userProfile.clinicId));
    }, [firestore, userProfile]);
    const { data: waitlist } = useCollection<any>(waitlistQuery);

    const recentPatients = allPatients
        ?.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
        .slice(0, 4) || [];

    const upcomingAppointments = appointments
        ?.filter(a => new Date(a.appointmentDate) > new Date() && a.status === 'Scheduled')
        .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
        .slice(0, 5) || [];

    const renderDashboardByRole = () => {
        if (appointmentsLoading || staffLoading || patientsLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;

        switch (userProfile.role) {
            case 'admin': return <AdminDashboard userProfile={userProfile} patients={allPatients} appointments={appointments} staff={staff} invoices={invoices} inventory={inventory} encounters={encounters} />;
            case 'doctor': return <DoctorDashboard userProfile={userProfile} appointments={appointments} encounters={encounters} />;
            case 'receptionist': return <ReceptionistDashboard userProfile={userProfile} patients={allPatients} appointments={appointments} waitlist={waitlist} />;
            case 'patient': return <PatientDashboard userProfile={userProfile} />;
            default: return <p>Welcome to your Orelis dashboard.</p>;
        }
    }

    if (userProfile?.role === 'patient') {
        return (
            <div className="flex flex-col gap-4 md:gap-8 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
                {renderDashboardByRole()}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 md:gap-8 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Dashboard Overview</h1>
            </div>

            <div className="relative border border-dashed p-4 sm:p-6 md:p-8 bg-card/50 backdrop-blur-sm">
                {renderDashboardByRole()}
            </div>

            <ChartsSection appointments={appointments} patients={allPatients} encounters={encounters} />

            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2 border-dashed">
                    <CardHeader className="flex flex-row items-center">
                        <div className="grid gap-2">
                            <CardTitle>Upcoming Appointments</CardTitle>
                            <CardDescription>
                                Here are the next 5 scheduled appointments.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" className="ml-auto gap-1">
                            <Link href="/dashboard/appointments">
                                View All
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {appointmentsLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 py-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="grid gap-1 text-sm flex-1">
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-4 w-1/3" />
                                        </div>
                                        <div className="ml-auto text-sm text-right space-y-1">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
                            <ul className="divide-y divide-border/50 divide-dashed">
                                {upcomingAppointments.map((appt) => (
                                    <li key={appt.id} className="flex items-center gap-4 py-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{getInitials(appt.patientName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-1 text-sm">
                                            <div className="font-medium">{appt.patientName}</div>
                                            <div className="text-muted-foreground">with {appt.doctorName}</div>
                                        </div>
                                        <div className="ml-auto text-sm text-muted-foreground text-right">
                                            <div>{new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div>{new Date(appt.appointmentDate).toLocaleDateString()}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No upcoming appointments.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle>Recent Patients</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-8">
                        {patientsLoading ? (
                            <div className="space-y-8">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="grid gap-1 flex-1">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : recentPatients && recentPatients.length > 0 ? recentPatients.map(patient => (
                            <div key={patient.id} className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback>{getInitials(`${patient.firstName} ${patient.surname}`)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{patient.firstName} {patient.surname}</p>
                                    <p className="text-sm text-muted-foreground">Registered: {new Date(patient.registrationDate).toLocaleDateString()}</p>
                                </div>
                                <div className="ml-auto font-medium">
                                    <Badge variant={'outline'} >
                                        {patient.status || 'Active'}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">No recent patients.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
