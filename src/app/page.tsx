


'use client';
import {
  Menu,
  HeartPulse,
  CalendarDays,
  Sparkles,
  Check,
  Shield,
  Quote,
  Twitter,
  Github,
  Linkedin,
  ArrowUpRight,
  LineChart,
  Tablet,
  Database,
  ChevronDown,
  Download,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { Footer } from '@/components/layout/footer';
import { HomepageRollingGallery } from '@/components/layout/homepage-rolling-gallery';
import { PublicHeader } from '@/components/layout/public-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LandingPage() {
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
        { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
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
        {/* Hero Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative mt-6 overflow-hidden border border-dashed border-border noisy-bg">
              <div className="pointer-events-none absolute inset-0">
                <span className="spark-border"></span>
                <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-orange-400/20 rounded-full animate-pulse-glow blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>

              <div className="relative flex min-h-[68vh] flex-col items-center justify-center p-6 pt-24 text-center sm:py-28 md:min-h-[76vh]">
                <Link
                  href="/future"
                  className="inline-flex items-center gap-2 rounded-full bg-orange-400/10 px-3.5 py-1.5 text-[13px] font-medium text-orange-400 dark:text-orange-300 ring-1 ring-orange-400/25 dark:ring-orange-300/25 transition hover:bg-orange-400/15 [animation:fadeSlideIn_0.8s_ease-out_0.3s_both]"
                >
                  <span className="text-[11px] uppercase tracking-widest text-orange-500/90 dark:text-orange-200/90">
                    New
                  </span>
                  <span className="tabular-nums">AI-Powered Reminders</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <h1 className="mt-6 max-w-4xl font-headline text-4xl font-light tracking-tighter text-foreground [animation:fadeSlideIn_0.8s_ease-out_0.4s_both] sm:text-5xl md:text-6xl">
                  Streamlining Patient Care.
                  <br />
                  One Platform. Zero Hassle.
                </h1>

                <p className="mt-5 max-w-2xl text-base text-muted-foreground [animation:fadeSlideIn_0.8s_ease-out_0.5s_both] sm:text-lg">
                  No complex setups or servers to manage. Orelis provides
                  a seamless, integrated solution for modern healthcare.
                </p>

                <div className="mt-8 flex flex-col items-center gap-3 [animation:fadeSlideIn_0.8s_ease-out_0.6s_both] sm:flex-row">
                  <Link href="/signup" className="contact-button dark:border-white/50 border-black/50 text-foreground hover:text-white">
                    Get Started
                  </Link>

                  <Link
                    href="/features"
                    className="inline-flex items-center justify-center overflow-hidden bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                  >
                    Explore Features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(249,115,22,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>
              <div className="relative p-8 sm:p-16">
                <div className="mb-12 text-center">
                  <div className="animate-on-scroll mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-400 dark:text-orange-300 ring-0 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
                    <span className="text-2xl font-light text-orange-400/80 dark:text-orange-300/80 tabular-nums">01</span>
                    <span className="text-orange-400/40">/</span>
                    <span className="text-[11px] uppercase tracking-widest text-orange-500/90 dark:text-orange-200/90">CORE FEATURES</span>
                  </div>
                  <h2 className="animate-on-scroll font-headline text-3xl font-light tracking-tight text-foreground [animation:fadeSlideIn_0.8s_ease-out_0.2s_both] sm:text-4xl lg:text-5xl">
                    Everything you need for patient management
                  </h2>
                  <p className="animate-on-scroll mx-auto mt-4 max-w-2xl text-base text-muted-foreground [animation:fadeSlideIn_0.8s_ease-out_0.3s_both] sm:text-lg">
                    A powerful suite of tools to streamline your clinic's workflow and enhance patient care.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="animate-on-scroll relative overflow-hidden bg-card/40 p-6 ring-1 ring-border [animation:fadeSlideIn_0.8s_ease-out_0.4s_both]">
                    <HeartPulse className="h-8 w-8 text-orange-500 mb-4" />
                    <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Patient Management</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Centralize patient records, track medical history, and manage documents securely.</p>
                  </div>
                  <div className="animate-on-scroll relative overflow-hidden bg-card/40 p-6 ring-1 ring-border [animation:fadeSlideIn_0.8s_ease-out_0.5s_both]">
                    <CalendarDays className="h-8 w-8 text-orange-500 mb-4" />
                    <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">Appointment Scheduling</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Intuitive calendars for receptionists to book, reschedule, and manage appointments.</p>
                  </div>
                  <div className="animate-on-scroll relative overflow-hidden bg-card/40 p-6 ring-1 ring-border [animation:fadeSlideIn_0.8s_ease-out_0.6s_both]">
                    <Sparkles className="h-8 w-8 text-orange-500 mb-4" />
                    <h3 className="font-headline text-lg font-medium tracking-tight text-foreground">AI-Powered Reminders</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Automated, intelligent SMS reminders to reduce no-shows and engage patients.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(249,115,22,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>
              <div className="relative flex flex-col items-center justify-center p-8 text-center sm:py-28 md:px-8 md:py-16">
                <div className="mb-12 text-center">
                  <div className="animate-on-scroll mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-400 dark:text-orange-300 ring-0 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
                    <span className="font-headline text-3xl font-light text-blue-500 dark:text-blue-300">02</span>
                    <span className="text-orange-400/40">/</span>
                    <span className="text-[11px] uppercase tracking-widest text-orange-500/90 dark:text-orange-200/90">HOW IT WORKS</span>
                  </div>
                  <h2 className="animate-on-scroll font-headline text-3xl font-light tracking-tight text-foreground [animation:fadeSlideIn_0.8s_ease-out_0.2s_both] sm:text-4xl lg:text-5xl">
                    Your Clinic, Supercharged in 3 Steps
                  </h2>
                  <p className="animate-on-scroll mx-auto mt-4 max-w-2xl text-base text-muted-foreground [animation:fadeSlideIn_0.8s_ease-out_0.3s_both] sm:text-lg">
                    From patient intake to post-visit follow-up, our streamlined workflow makes clinic management effortless.
                  </p>
                </div>
                <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="animate-on-scroll flex flex-col items-center text-center [animation:fadeSlideIn_0.8s_ease-out_0.4s_both]">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
                      <span className="font-headline text-3xl font-light text-blue-500 dark:text-blue-300">01</span>
                    </div>
                    <h3 className="mb-3 font-headline text-xl font-medium tracking-tight text-foreground">Schedule & Intake</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Easily book appointments and capture patient information with our intuitive online forms.</p>
                  </div>
                  <div className="animate-on-scroll flex flex-col items-center text-center [animation:fadeSlideIn_0.8s_ease-out_0.5s_both]">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 ring-1 ring-orange-500/20">
                      <span className="font-headline text-3xl font-light text-orange-500 dark:text-orange-300">02</span>
                    </div>
                    <h3 className="mb-3 font-headline text-xl font-medium tracking-tight text-foreground">Manage & Document</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Access and update patient records, vitals, and treatment plans in a centralized, secure dashboard.</p>
                  </div>
                  <div className="animate-on-scroll flex flex-col items-center text-center [animation:fadeSlideIn_0.8s_ease-out_0.6s_both]">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 ring-1 ring-purple-500/20">
                      <span className="font-headline text-3xl font-light text-purple-500 dark:text-purple-300">03</span>
                    </div>
                    <h3 className="mb-3 font-headline text-xl font-medium tracking-tight text-foreground">Automate & Follow-up</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Send automated appointment reminders and follow-up messages to improve patient engagement.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* New Homepage Gallery Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="relative p-8 sm:p-16 text-center">
                <h2 className="text-3xl font-light tracking-tighter text-foreground sm:text-4xl lg:text-5xl font-headline">A Visual Tour of Modern Healthcare</h2>
                <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">Explore glimpses of the clean, intuitive, and powerful interface that Orelis brings to clinics and patients alike.</p>
              </div>
              <HomepageRollingGallery />
            </div>
          </div>
        </section>


        {/* Testimonial Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>
              <div className="relative p-8 text-left sm:p-16">
                <div className="[animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll text-left max-w-3xl mb-16">
                  <div className="inline-flex text-[13px] font-medium text-orange-400 dark:text-orange-300 rounded-none ring-0 mb-6 pt-1.5 pr-3.5 pb-1.5 pl-3.5 gap-x-2 gap-y-2 items-center">
                    <span className="tabular-nums text-2xl font-light text-orange-400/80 dark:text-orange-300/80">03</span>
                    <span className="text-orange-400/40">/</span>
                    <span className="uppercase text-[11px] text-orange-500/90 dark:text-orange-200/90 tracking-widest">Testimonials</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-light tracking-tight text-foreground mb-4">
                    Trusted by Leading Healthcare Professionals
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    See what doctors and clinic managers are saying about Orelis.
                  </p>
                </div>
                <div className="w-full">
                  <div className="grid lg:grid-cols-2 lg:gap-y-8 lg:gap-x-6 gap-x-6 gap-y-8 items-stretch">
                    <div className="overflow-hidden min-h-[420px] [animation:fadeSlideIn_0.8s_ease-out_0.2s_both] animate-on-scroll relative">
                      <Image src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?q=80&w=1080&auto=format&fit=crop" alt="Customer portrait" fill className="opacity-100 object-cover" />
                    </div>
                    <div className="flex flex-col sm:p-10 [animation:fadeSlideIn_0.8s_ease-out_0.3s_both] animate-on-scroll text-left bg-card ring-1 ring-border pt-8 pr-8 pb-8 pl-8 relative justify-center">
                      <div className="mb-4">
                        <Quote className="h-8 w-8 text-orange-500" />
                      </div>
                      <p className="text-foreground font-headline tracking-tight text-2xl sm:text-3xl lg:text-4xl leading-snug">
                        "Orelis has been a revelation for our clinic's efficiency and patient communication."
                      </p>
                      <div className="mt-8">
                        <div className="text-foreground text-base font-medium">Dr. Evelyn Reed</div>
                        <div className="text-muted-foreground text-sm mt-1">Head of Cardiology</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid lg:grid-cols-3 [animation:fadeSlideIn_0.8s_ease-out_0.4s_both] animate-on-scroll mt-6 relative gap-x-6 gap-y-6">
                    <div className="flex flex-col text-left bg-card/45 ring-border ring-1 pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
                      <p className="text-muted-foreground text-base leading-relaxed">
                        "The AI-powered reminders have drastically reduced no-shows, and the dashboard gives us incredible insight into our operations."
                      </p>
                      <div className="flex items-center gap-3 mt-6">
                        <Image src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=320&auto=format&fit=crop" alt="Michael Chen avatar" width={40} height={40} className="h-10 w-10 object-cover ring-1 ring-border" />
                        <div>
                          <div className="text-foreground text-sm font-medium">Michael Chen</div>
                          <div className="text-muted-foreground text-xs">Clinic Manager</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col text-left bg-card/45 ring-border ring-1 pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
                      <p className="leading-relaxed text-base text-muted-foreground">
                        "Patient management is seamless, and the platform is so intuitive. Our team was onboarded in less than a day."
                      </p>
                      <div className="flex gap-3 mt-6 gap-x-3 gap-y-3 items-center">
                        <Image src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=320&auto=format&fit=crop" alt="Emily Roberts avatar" width={40} height={40} className="h-10 w-10 object-cover ring-1 ring-border" />
                        <div>
                          <div className="text-foreground text-sm font-medium">Dr. Emily Roberts</div>
                          <div className="text-muted-foreground text-xs">Lead Physician @ HealthSync</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col text-left bg-card/45 ring-border ring-1 pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
                      <p className="text-muted-foreground text-base leading-relaxed">
                        "The security and reliability are top-notch. We trust Orelis with our most sensitive patient data without a second thought."
                      </p>
                      <div className="flex items-center gap-3 mt-6">
                        <Image src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=320&auto=format&fit=crop" alt="David Park avatar" width={40} height={40} className="h-10 w-10 object-cover ring-1 ring-border" />
                        <div>
                          <div className="text-foreground text-sm font-medium">David Park</div>
                          <div className="text-muted-foreground text-xs">IT Director @ ClinicPlus</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Pillars Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg p-8 sm:p-12 md:p-16 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)]">
                </div>
                <div className="absolute inset-0 opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)] bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px]">
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>

              <div className="relative mx-auto max-w-3xl text-center">
                <div className="animate-on-scroll [animation:fadeSlideIn_0.8s_ease-out_0.2s_both]">
                  <div className="flex justify-center">
                    <div className="inline-flex text-[13px] font-medium text-orange-400 dark:text-orange-300 rounded-none ring-0 mb-6 pt-1.5 pr-3.5 pb-1.5 pl-3.5 gap-x-2 gap-y-2 items-center">
                      <span className="tabular-nums text-2xl font-light text-orange-400/80 dark:text-orange-300/80">04</span>
                      <span className="text-orange-400/40">/</span>
                      <span className="uppercase text-[11px] text-orange-500/90 dark:text-orange-200/90 tracking-widest">CORE TENETS</span>
                    </div>
                  </div>

                  <h2 className="sm:text-4xl lg:text-5xl text-3xl font-light text-foreground tracking-tight text-center mb-4">
                    A Platform Built on Trust and Intelligence
                  </h2>
                  <p className="leading-relaxed sm:text-lg text-base text-muted-foreground mb-8 text-center max-w-2xl mx-auto">
                    Our platform is engineered to be a comprehensive ecosystem, built on pillars of security, accessibility, and actionable intelligence to create a seamless clinical experience.
                  </p>

                  <ul className="mb-8 space-y-4 max-w-md mx-auto text-left">
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                        <Shield className="w-3 h-3 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground text-left">Proactive Security</p>
                        <p className="text-sm text-muted-foreground text-left">Beyond compliance, Orelis offers proactive threat detection and data encryption that sets a new industry standard.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                        <Tablet className="w-3 h-3 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground text-left">Unified Accessibility</p>
                        <p className="text-sm text-muted-foreground text-left">Access patient data from anywhere, on any device, providing a holistic view of patient health.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                        <LineChart className="w-3 h-3 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground text-left">Predictive Intelligence</p>
                        <p className="text-sm text-muted-foreground text-left">Our analytics will evolve from reporting to predicting, turning data into decisive action for better patient outcomes.</p>
                      </div>
                    </li>
                  </ul>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/signup" className="contact-button dark:border-white/50 border-black/50 text-foreground hover:text-white">Get Started</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Pricing Section */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg p-8 sm:p-16 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(249,115,22,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>
              <div className="relative mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-400 dark:text-orange-300 ring-0">
                  <span className="text-2xl font-light text-orange-400/80 dark:text-orange-300/80 tabular-nums">05</span>
                  <span className="text-orange-400/40">/</span>
                  <span className="text-[11px] uppercase tracking-widest text-orange-500/90 dark:text-orange-200/90">SIMPLE PRICING</span>
                </div>
                <h2 className="mb-4 font-headline text-3xl font-light tracking-tight text-foreground sm:text-4xl lg:text-5xl">Transparent, Affordable, Powerful.</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">No hidden fees. We believe premium healthcare management should be accessible to every doctor.</p>

                <div className="mt-12 flex justify-center">
                  <Card className="max-w-md w-full border-primary/50 shadow-2xl shadow-primary/20 bg-card/40 ring-1 ring-primary/20">
                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-2xl font-bold">Orelis Doctor Business</CardTitle>
                      <div className="flex items-baseline justify-center gap-1 mt-4">
                        <span className="text-5xl font-bold text-foreground">₦2,000</span>
                        <span className="text-muted-foreground text-lg">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-8">
                      <ul className="space-y-4 text-sm text-left px-4">
                        <li className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Unlimited Patient Management</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Advanced SOAP Records</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Digital Patient Portals</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Cloud Data Security</span>
                        </li>
                      </ul>
                      <Link href="/signup" className="contact-button contact-button-glowing w-full mt-8 block">Start Your Practice</Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border p-8 sm:p-16 noisy-bg card-glow [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>
              <div className="relative mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-400 dark:text-orange-300 ring-0">
                  <span className="text-2xl font-light text-orange-400/80 dark:text-orange-300/80 tabular-nums">
                    06
                  </span>
                  <span className="text-orange-400/40">/</span>
                  <span className="text-[11px] uppercase tracking-widest text-orange-500/90 dark:text-orange-200/90">
                    Get Started
                  </span>
                </div>
                <h2 className="mb-4 font-headline text-3xl font-light tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Ready to Transform Your Practice?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Join hundreds of modern clinics who trust Orelis to
                  deliver exceptional patient care.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className="contact-button dark:border-white/50 border-black/50 text-foreground hover:text-white">
                    Sign Up Now
                  </Link>
                  <Link
                    href="/features"
                    className="inline-flex items-center justify-center overflow-hidden bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                  >
                    Explore Features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}
