
'use client';
import { HeartPulse, CalendarDays, Sparkles, ArrowUpRight, Shield, LineChart, Database, FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';

export function FeaturesClientPage() {
   useEffect(() => {
    const initInViewAnimations = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
      );

      document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
      });
    };

    initInViewAnimations();
  }, []);

  return (
    <div className="bg-background text-foreground transition-colors duration-300">
      <PublicHeader />

      <main className="pt-16">
        <section className="relative py-24 sm:py-32 noisy-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative mt-6 overflow-hidden border border-dashed border-border">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-orange-400/20 rounded-full animate-pulse-glow blur-3xl"></div>
                    <div 
                      className="absolute inset-0 [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]" 
                      style={{ 
                        backgroundImage: 'linear-gradient(to right, rgba(120, 120, 120, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(120, 120, 120, 0.15) 1px, transparent 1px)', 
                        backgroundSize: '28px 28px' 
                      }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background"></div>
                </div>

                <div className="relative flex min-h-[68vh] flex-col items-center justify-center p-6 pt-24 text-center sm:py-28 md:min-h-[76vh]">
                    <Link
                    href="/future"
                    className="inline-flex items-center gap-2 rounded-full bg-orange-400/10 px-3.5 py-1.5 text-[13px] font-medium text-orange-300 ring-1 ring-orange-300/25 transition hover:bg-orange-400/15 [animation:fadeSlideIn_0.8s_ease-out_0.3s_both]"
                    >
                    <span className="text-[11px] uppercase tracking-widest text-orange-200/90">
                        New
                    </span>
                    <span className="tabular-nums">AI-Powered Reminders</span>
                    <ArrowUpRight className="h-4 w-4" />
                    </Link>

                    <h1 className="mt-6 max-w-4xl font-headline text-4xl font-light tracking-tighter text-foreground [animation:fadeSlideIn_0.8s_ease-out_0.4s_both] sm:text-5xl md:text-6xl">
                      Tools for the Modern Clinic.
                      <br />
                      Powerful, Simple, Secure.
                    </h1>

                    <p className="mt-5 max-w-2xl text-base text-muted-foreground [animation:fadeSlideIn_0.8s_ease-out_0.5s_both] sm:text-lg">
                      Discover the powerful features that make Orelis the leading solution for modern healthcare management, from patient scheduling to AI-driven insights.
                    </p>

                    <div className="mt-8 flex flex-col items-center gap-3 [animation:fadeSlideIn_0.8s_ease-out_0.6s_both] sm:flex-row">
                      <Link href="/pricing" className="contact-button">
                          View Pricing
                      </Link>
                    </div>
                </div>
            </div>
          </div>
        </section>

        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
                  <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow"></div>
                      <div 
                        className="absolute inset-0 [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]" 
                        style={{ 
                          backgroundImage: 'linear-gradient(to right, rgba(120, 120, 120, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(120, 120, 120, 0.15) 1px, transparent 1px)', 
                          backgroundSize: '28px 28px' 
                        }}
                      ></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background"></div>
                  </div>
                  <div className="relative p-8 sm:p-16">
                      <div className="mb-12 text-center">
                          <h2 className="animate-on-scroll font-headline text-3xl font-light tracking-tight text-foreground [animation:fadeSlideIn_0.8s_ease-out_0.2s_both] sm:text-4xl lg:text-5xl">
                               A Comprehensive Toolkit for Healthcare
                          </h2>
                          <p className="animate-on-scroll mx-auto mt-4 max-w-2xl text-base text-muted-foreground [animation:fadeSlideIn_0.8s_ease-out_0.3s_both] sm:text-lg">
                               Orelis is designed to be the central nervous system of your clinic. Our features are built to work together seamlessly, providing a unified and powerful management experience.
                          </p>
                      </div>
                      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                          <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.4s_both]">
                              <HeartPulse className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Patient Record Management</h3>
                              <p className="mt-2 text-sm text-muted-foreground">A complete, secure, and easily accessible digital file for every patient. Track medical history, upload documents, and manage all patient-related information from a single dashboard.</p>
                          </div>
                          <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.5s_both]">
                              <CalendarDays className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Intelligent Scheduling</h3>
                              <p className="mt-2 text-sm text-muted-foreground">Our intuitive calendar allows receptionists to book, reschedule, and manage appointments with ease, avoiding conflicts and optimizing doctor availability.</p>
                          </div>
                           <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.6s_both]">
                              <Sparkles className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">AI-Powered Reminders</h3>
                              <p className="mt-2 text-sm text-muted-foreground">Drastically reduce no-shows with automated, intelligent SMS reminders. Our AI personalizes messages and timing for maximum patient engagement.</p>
                          </div>
                          <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.7s_both]">
                              <FileText className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Digital Consent Forms</h3>
                              <p className="mt-2 text-sm text-muted-foreground">Go paperless with secure, digital consent forms. Patients can sign electronically, and forms are automatically filed into their record.</p>
                          </div>
                           <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.8s_both]">
                              <LineChart className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Analytics & Reporting</h3>
                              <p className="mt-2 text-sm text-muted-foreground">Gain valuable insights into your clinic's performance with comprehensive dashboards. Track appointments, patient growth, and more.</p>
                          </div>
                           <div className="animate-on-scroll relative overflow-hidden bg-card p-6 border border-border [animation:fadeSlideIn_0.8s_ease-out_0.9s_both]">
                              <Shield className="h-8 w-8 text-orange-400 mb-4"/>
                              <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Role-Based Access Control</h3>
                              <p className="mt-2 text-sm text-muted-foreground">Ensure data security and privacy with granular, role-based permissions for Admins, Doctors, and Receptionists.</p>
                          </div>
                      </div>
                  </div>
              </div>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
