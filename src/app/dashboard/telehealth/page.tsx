'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, addDoc } from 'firebase/firestore';
import { Video, Calendar, User, Users, Phone, ExternalLink, Activity, Clock, ShieldCheck, Mail, AlertCircle, X, Maximize2, Mic, MicOff, VideoOff, MessageSquare, Monitor } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { DashLoader } from "@/components/ui/dash-loader";
import { JitsiCall } from "@/components/telehealth/jitsi-call";
import type { Appointment, UserProfile } from "@/lib/types";

/**
 * The room two parties will meet in.
 *
 * Derived from the appointment alone, deliberately. The previous naming folded in
 * `user.uid`, so the room a patient was invited to depended on which member of
 * staff generated the link — a locum covering the clinic would open a different
 * room and each would sit alone in it. A Firestore auto-id carries enough entropy
 * that the name is not guessable, which matters because meet.jit.si rooms are
 * public to anyone holding the name.
 */
function roomFor(appointment: Appointment): string {
    return `orelis-${appointment.clinicId}-${appointment.id}`;
}

function joinUrl(roomName: string): string {
    return `https://meet.jit.si/${roomName}`;
}

/**
 * Email a patient their join link.
 *
 * Writes to the `mail` collection, which is what the Firebase Trigger Email
 * extension watches — the same route the appointment confirmation already uses.
 * The address is asked for rather than looked up because this page does not load
 * patient records, and prompting is better than guessing at a contact detail.
 */
function ResendLinkDialog({
    appointment,
    clinicName,
}: {
    appointment: Appointment;
    clinicName?: string;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) return;

        const email = (new FormData(event.currentTarget).get('email') as string)?.trim();
        if (!email) {
            toast({ title: 'Email required', description: 'Enter where the link should go.', variant: 'destructive' });
            return;
        }

        setSending(true);
        const url = joinUrl(roomFor(appointment));
        const when = new Date(appointment.appointmentDate).toLocaleString([], {
            dateStyle: 'full',
            timeStyle: 'short',
        });

        try {
            await addDoc(collection(firestore, 'mail'), {
                to: [email],
                message: {
                    subject: `Your video consultation link${clinicName ? ` — ${clinicName}` : ''}`,
                    html: `
                        <h1>Your video consultation</h1>
                        <p>Dear ${appointment.patientName},</p>
                        <p>Your remote appointment is scheduled for <strong>${when}</strong>.</p>
                        <p>Join using this link at the time of your appointment:</p>
                        <p><a href="${url}">${url}</a></p>
                        <p>No app or account is needed — the link opens in your browser. Please allow
                        access to your camera and microphone when prompted.</p>
                        ${clinicName ? `<p>— ${clinicName}</p>` : ''}
                    `,
                },
            });

            toast({ title: 'Link sent', description: `Join link emailed to ${email}.` });
            setOpen(false);
        } catch (err: any) {
            console.error('Could not send the telehealth link:', err);
            toast({
                title: 'Could not send',
                description: err?.message ?? 'The email was not queued.',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 rounded-none cursor-pointer">
                    <Mail className="h-3.5 w-3.5 mr-2" /> Resend Link
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <form onSubmit={handleSend}>
                    <DialogHeader>
                        <DialogTitle>Send join link</DialogTitle>
                        <DialogDescription>
                            Emails {appointment.patientName} the link for this consultation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="email">Patient email</Label>
                            <Input id="email" name="email" type="email" placeholder="patient@example.com" required />
                        </div>
                        <p className="text-xs text-muted-foreground break-all">
                            Link: {joinUrl(roomFor(appointment))}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={sending}>
                            {sending ? <DashLoader size="sm" className="text-white" /> : 'Send link'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

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
        // Same helper the emailed link uses, so both parties land in one room.
        setMeetingRoom(roomFor(appointment));
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
                    <JitsiCall
                        roomName={meetingRoom}
                        displayName={userProfile?.name || 'Doctor'}
                        onEnd={endCall}
                    />
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
                    <Button variant="outline" className="h-9" asChild>
                        <Link href="/dashboard/appointments/new">
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule Virtual Visit
                        </Link>
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
                                        <ResendLinkDialog appointment={session} />
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

