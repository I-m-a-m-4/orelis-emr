import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import { Heart, MapPin, Phone, Mail, Clock, ShieldCheck, Stethoscope, Users, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

interface ClinicPageProps {
    params: { id: string };
}

// THIS IS A SERVER COMPONENT for SEO
export async function generateMetadata({ params }: ClinicPageProps): Promise<Metadata> {
    const clinicId = params.id;
    // Note: In a production environment with proper Firebase Admin setup:
    // const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    // const clinic = clinicDoc.data();

    // For now, we'll use a placeholder or assume the clinician will provide metadata
    // In actual implementation, fetch from Firestore
    return {
        title: `Clinic Details | Orelis Medical`,
        description: `Find medical services, contact information, and appointments at this facility powered by Orelis Medical EMR.`,
        openGraph: {
            images: ['/logo.png'],
        }
    };
}

export default async function ClinicPublicPage({ params }: ClinicPageProps) {
    const clinicId = params.id;

    let clinic = {
        name: "Premium Health Center",
        address: "123 Medical Drive, Lagos, Nigeria",
        phone: "+234 800 123 4567",
        email: "contact@premiumhealth.com",
        registrationDate: new Date().toISOString(),
        specialties: ["General Practice", "Pediatrics", "Cardiology"],
        bio: "Providing world-class medical services with modern EMR technology. Our facility is equipped with state-of-the-art diagnostic tools powered by Orelis Medical Intelligence.",
        status: "Verified Platinum Provider"
    };

    try {
        const db = await getAdminDb();
        const doc = await db.collection('clinics').doc(clinicId).get();
        if (doc.exists) {
            const data = doc.data() as any;
            clinic = {
                ...clinic,
                ...data,
                name: data.name || clinic.name,
                address: data.address || clinic.address,
                bio: data.bio || data.description || clinic.bio,
            };
        }
    } catch (e) {
        console.error("Clinic SEO Fetch Error:", e);
    }

    return (
        <div className="min-h-screen bg-background font-dm-sans">
            {/* SEO Wrapper */}
            <main className="max-w-4xl mx-auto py-20 px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
                        <ShieldCheck className="w-4 h-4" /> Trusted Orelis Partner
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground">
                        {clinic.name}
                    </h1>
                    <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" /> {clinic.address}
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-8">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-primary" /> About Our Facility
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {clinic.bio}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {clinic.specialties.map(spec => (
                                    <Badge key={spec} variant="secondary" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors px-3 py-1 text-xs font-bold uppercase">
                                        {spec}
                                    </Badge>
                                ))}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="border-dashed bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                                        <Clock className="w-4 h-4" /> Operating Hours
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">Mon - Fri</span>
                                        <span className="text-muted-foreground">8:00 AM - 6:00 PM</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">Saturday</span>
                                        <span className="text-muted-foreground">9:00 AM - 2:00 PM</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">Sunday</span>
                                        <span className="text-emerald-500 font-bold uppercase text-[10px]">Emergency Only</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-dashed bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                                        <Users className="w-4 h-4" /> Patient Care
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        This clinic uses Orelis to provide you with secure patient codes and instant record access.
                                    </p>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] w-full justify-center">
                                        Accepting New Patients
                                    </Badge>
                                </CardContent>
                            </Card>
                        </section>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-6">
                        <Card className="border-dashed border-primary shadow-2xl bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg font-black uppercase tracking-tight">Booking Portal</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    Skip the queue by booking your appointment online through our secure portal.
                                </p>
                                <Button className="w-full h-12 text-md font-black button-glow" asChild>
                                    <Link href="/patient-portal">Book Appointment</Link>
                                </Button>
                                <div className="space-y-3 pt-4 border-t border-dashed border-primary/20">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold">{clinic.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold truncate">{clinic.email}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 rounded-xl border border-dashed bg-muted/30 text-center space-y-2">
                            <div className="flex justify-center gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                ))}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                Digital Health Certified
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer / Powered By */}
                <div className="pt-20 border-t border-dashed border-muted text-center flex flex-col items-center gap-4">
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        Powered by <span className="font-black text-foreground uppercase tracking-wider">Orelis Medical</span>
                    </p>
                    <div className="flex gap-4">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                        <Heart className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>
            </main>
        </div>
    );
}
