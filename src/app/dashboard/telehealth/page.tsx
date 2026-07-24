'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Video, Calendar, User, Users, Phone, ExternalLink, Activity, Clock, ShieldCheck, Mail, AlertCircle, X, Maximize2, Mic, MicOff, VideoOff, MessageSquare, Monitor } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Appointment, UserProfile } from "@/lib/types";

export default function TelehealthPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [activeCall, setActiveCall] = useState<Appointment | null>(null);
    const [meetingRoom, setMeetingRoom] = useState<string | null>(null);

    // Load user profile
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Load appointments specifically for Telehealth
    const telehealthQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'appointments'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('appointmentDate', 'desc')
        );
    }, [firestore, userProfile?.clinicId]);

    const { data: appointments, loading } = useCollection<Appointment>(telehealthQuery);

    const telehealthAppointments = useMemo(() => {
        if (!appointments) return [];
        return appointments.filter(app => app.status === 'Scheduled');
    }, [appointments]);

    const startCall = (appointment: Appointment) => {
        const roomName = `orelis-${appointment.id}-${user?.uid?.substring(0, 5)}`;
        setMeetingRoom(roomName);
        setActiveCall(appointment);
        toast({
            title: "Connecting...",
            description: `Starting virtual session with ${appointment.patientName}`,
        });
    };

    const startImmediateCall = () => {
        const roomName = `orelis-instant-${user?.uid?.substring(0, 8)}`;
        setMeetingRoom(roomName);
        setActiveCall({
            id: 'instant',
            patientName: 'Instant Guest',
            appointmentDate: new Date().toISOString(),
            status: 'Scheduled',
            clinicId: userProfile?.clinicId || '',
        } as any);
    };

    const endCall = () => {
        setActiveCall(null);
        setMeetingRoom(null);
        toast({
            title: "Session Ended",
            description: "Virtual consultation has been closed.",
        });
    };

    if (activeCall && meetingRoom) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
                <header className="h-16 border-b border-dashed flex items-center justify-between px-6 bg-card/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-none border border-primary/20">
                            <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm tracking-tight">{activeCall.patientName}</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-black">Secure Telehealth Session</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5 h-6">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Encrypted
                        </Badge>
                        <Button variant="destructive" size="sm" onClick={endCall} className="rounded-none h-8">
                            <X className="h-4 w-4 mr-2" /> End Consultation
                        </Button>
                    </div>
                </header>
                <div className="flex-1 bg-black relative">
                    <iframe
                        src={`https://meet.jit.si/${meetingRoom}#config.prejoinPageEnabled=false&userInfo.displayName="${userProfile?.name || 'Doctor'}"`}
                        className="w-full h-full border-none"
                        allow="camera; microphone; display-capture; autoplay; clipboard-write"
                    />

                    {/* Controls Overlay (Mockup style for Orelis aesthetics) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-background/20 backdrop-blur-xl border border-white/10 rounded-none shadow-2xl">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-none bg-white/5 border-white/10 hover:bg-white/10">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-none bg-white/5 border-white/10 hover:bg-white/10">
                            <Video className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-none bg-white/5 border-white/10 hover:bg-white/10">
                            <Monitor className="h-5 w-5" />
                        </Button>
                        <div className="w-px h-8 bg-white/10" />
                        <Button variant="destructive" size="icon" className="h-12 w-12 rounded-none" onClick={endCall}>
                            <Phone className="h-5 w-5 rotate-[135deg]" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-2xl tracking-tight">Telehealth & Remote Care</h1>
                    <p className="text-muted-foreground text-sm">Secure virtual consultations and remote patient monitoring.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9">
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Virtual Visit
                    </Button>
                    <Button className="button-glow h-9" onClick={startImmediateCall}>
                        <Video className="mr-2 h-4 w-4" />
                        Start Immediate Session
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-dashed backdrop-blur-sm bg-background/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Upcoming Virtual Sessions</CardTitle>
                            <CardDescription>Scheduled remote appointments for the clinic.</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-indigo-500 border-indigo-500/30 bg-indigo-500/5">
                            <Activity className="h-3 w-3 mr-1 animate-pulse" /> Live Now
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-12 text-muted-foreground"><Clock className="animate-spin h-6 w-6 mr-2" /> Loading sessions...</div>
                        ) : telehealthAppointments.length > 0 ? (
                            telehealthAppointments.map((session) => (
                                <div key={session.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-none border border-dashed bg-muted/50 hover:bg-muted/70 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/30">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{session.patientName}</h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {new Date(session.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 group-hover:bg-indigo-500 group-hover:text-white transition-all rounded-none"
                                            onClick={() => startCall(session)}
                                        >
                                            <Video className="h-3.5 w-3.5 mr-2" /> Start Call
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 rounded-none">
                                            <Mail className="h-3.5 w-3.5 mr-2" /> Resend Link
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-muted/20 border border-dashed rounded-none">
                                <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="font-medium">No Sessions Scheduled</h3>
                                <p className="text-sm text-muted-foreground">Virtual appointments will appear here once scheduled.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                                Security Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">HIPAA Compliant</span>
                                <Badge variant="default" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/10 border-none rounded-none">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">End-to-End Encryption</span>
                                <Badge variant="default" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/10 border-none rounded-none">Enabled</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Network Latency</span>
                                <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10 rounded-none">24ms (Excellent)</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-indigo-500" />
                                Quick Tips
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                • Ensure you have a stable internet connection before starting a video call.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                • Patient links are valid for up to 30 minutes after the scheduled time.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                • You can record sessions for clinical review with patient consent.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

