
'use client';
import { Star, Sparkles, Database, LineChart, Users, ShieldCheck, Quote, Tablet, Shield, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/footer';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import { FutureHeroAnimation } from '@/components/layout/future-hero-animation';
import { PublicHeader } from '@/components/layout/public-header';

export default function FuturePage() {
  const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500); // Simulate a loading time

    return () => clearTimeout(timer);
  }, []);

   useEffect(() => {
    if (isLoading) return;

    const initInViewAnimations = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
      });
    };

    initInViewAnimations();
  }, [isLoading]);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="bg-background text-foreground transition-colors duration-300">
      <PublicHeader />

      <main className="noisy-bg pt-16">
        <section className="relative mx-auto grid h-auto w-full grid-cols-4 gap-x-4 lg:grid-cols-12 lg:gap-x-6 my-20 bg-transparent px-4 first:mt-4 lg:mt-20 lg:px-9 first:lg:mt-10 lg:mb-30 lg:h-[calc(100dvh-160px)] lg:max-h-[725px] lg:min-h-[620px] xl:mb-22">
            <div className="z-10 col-span-4 flex max-w-[650px] flex-col justify-between lg:col-span-6 lg:max-w-none">
                <div className="flex flex-col gap-y-6 lg:gap-y-8">
                    <div className="text-pretty font-mono text-[14px] leading-[100%] tracking-[-0.0175rem] text-gl invisible inline-flex items-center uppercase [&amp;&gt;[data-slot='badge-icon']]:border-transparent [&amp;&gt;[data-slot='badge-icon']]:bg-accent-300 [&amp;_*]:text-base-500 gap-3 pt-4" style={{translate: 'none', rotate: 'none', scale: 'none', opacity: 1, transform: 'translate(0px, 0px)', visibility: 'inherit'}}>
                        <div className="size-2 transform-gpu rounded-full border will-change-[background-color]" data-slot="badge-icon" style={{backfaceVisibility: 'hidden', backgroundColor: 'var(--color-accent-200)'}}></div>
                        <p className="whitespace-nowrap text-foreground text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase" style={{overflow: 'hidden', display: 'inline-block'}}>Our Vision</p>
                    </div>
                    <h1 className="text-foreground font-normal text-[40px] leading-[100%] tracking-[-0.16rem] lg:tracking-[-0.18rem] lg:-ml-1 lg:text-6xl 2xl:text-7xl visible" aria-label="Agent-NativeSoftware Development">
                        <span className="char-reveal" aria-hidden="true" style={{color: 'hsl(var(--primary))', opacity: 1, transform: 'translate(0px, 0px)', visibility: 'inherit'}}>The Future of</span>
                        <br style={{display: 'inline-block'}} />
                        <span className="char-reveal" aria-hidden="true" style={{color: 'hsl(var(--primary))', opacity: 1, transform: 'translate(0px, 0px)', visibility: 'inherit'}}>Healthcare is Here</span>
                    </h1>
                    <div className="invisible flex flex-col gap-y-4 lg:max-w-[600px] lg:gap-y-6" style={{translate: 'none', rotate: 'none', scale: 'none', opacity: 1, visibility: 'inherit', transform: 'translate(0px, 0px)'}}>
                        <p className="font-mono text-[16px] leading-[120%] tracking-[-0.02rem] lg:text-[18px] lg:tracking-[-0.0225rem] text-muted-foreground text-balance">Orelis is poised to become an indispensable partner for modern clinics. We envision a platform that not only streamlines current workflows but anticipates future needs.</p>
                        <p className="font-mono text-[16px] leading-[120%] tracking-[-0.02rem] lg:text-[18px] lg:tracking-[-0.0225rem] text-muted-foreground text-balance">Imagine AI that helps with preliminary diagnoses, automates inventory management, and provides predictive analytics to prevent appointment no-shows before they happen. This is the future we're building—a future where technology empowers healthcare professionals to deliver truly exceptional care.</p>
                    </div>
                </div>
            </div>
            <FutureHeroAnimation />
        </section>

        {/* Platform Pillars Section */}
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="animate-on-scroll relative mt-6 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both] noisy-bg border border-dashed border-border p-8 rounded-2xl">
                    <div className="text-center mb-12">
                         <div className="mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-300 ring-0">
                          <span className="text-2xl font-light text-orange-300/80 tabular-nums">01</span>
                          <span className="text-orange-300/40">/</span>
                          <span className="text-[11px] uppercase tracking-widest text-orange-200/90">PLATFORM PILLARS</span>
                      </div>
                        <h2 className="font-headline text-3xl font-light tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                           Core Tenets of Our Platform
                         </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-base text-muted-foreground sm:text-lg">
                           Orelis is engineered to be a comprehensive ecosystem, built on pillars of security, accessibility, and actionable intelligence to create a seamless clinical experience.
                        </p>
                    </div>

                    <div className="relative grid lg:grid-cols-2 gap-8 items-center">
                        <div className="relative flex flex-col p-8 rounded-2xl min-h-[400px] justify-center items-center">
                             <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background opacity-80"></div>
                             <div className="w-full h-full rounded-xl schema-gradient-border schema-inner-glow overflow-hidden relative">
                                <div className="absolute inset-0 opacity-10">
                                    <div className="w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                                </div>
                                
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
                                    <defs>
                                    <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" style={{stopColor:'#10b981', stopOpacity:0.8}} />
                                        <stop offset="50%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                                        <stop offset="100%" style={{stopColor:'#10b981', stopOpacity:0.8}} />
                                    </linearGradient>
                                    </defs>
                                    
                                    <g stroke="url(#connectionGradient)" strokeWidth="1" fill="none">
                                        <path className="connector" d="M100,100 L180,100 L180,150 L260,150" />
                                        <path className="connector" d="M260,150 L300,150" />
                                        <path className="connector" d="M180,150 L180,200 L260,200" />
                                    
                                        <circle cx="100" cy="100" r="4" fill="#10b981"/>
                                        <circle cx="260" cy="150" r="4" fill="#3b82f6"/>
                                        <circle cx="300" cy="150" r="4" fill="#10b981"/>
                                        <circle cx="260" cy="200" r="4" fill="#3b82f6"/>
                                    </g>
                                </svg>
                                
                                <div className="absolute inset-0 w-full h-full">
                                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2" style={{animation: 'schemaPulse 4s ease-in-out infinite'}}>
                                        <div className="w-20 h-20 glass rounded-full flex items-center justify-center border border-orange-400/30 schema-inner-glow">
                                            <Database className="w-8 h-8 text-orange-400" />
                                        </div>
                                    </div>
                                    
                                    <div className="absolute left-12 top-24 table-float">
                                        <div className="w-32 h-20 glass rounded-lg schema-gradient-border shadow-lg overflow-hidden">
                                            <div className="bg-gradient-to-r from-orange-500/20 to-blue-500/20 text-foreground text-xs px-2 py-1 font-medium border-b border-border/10">Patients</div>
                                            <div className="px-2 py-1 space-y-1">
                                                <div className="h-1.5 w-20 bg-foreground/30 rounded"></div>
                                                <div className="h-1.5 w-16 bg-foreground/20 rounded"></div>
                                                <div className="h-1.5 w-24 bg-foreground/20 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute right-12 top-24 table-float" style={{animationDelay: '-1s'}}>
                                        <div className="w-32 h-20 glass rounded-lg schema-gradient-border shadow-lg overflow-hidden">
                                            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground text-xs px-2 py-1 font-medium border-b border-border/10">Appointments</div>
                                            <div className="px-2 py-1 space-y-1">
                                                <div className="h-1.5 w-20 bg-foreground/30 rounded"></div>
                                                <div className="h-1.5 w-12 bg-foreground/20 rounded"></div>
                                                <div className="h-1.5 w-24 bg-foreground/20 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-12 table-float" style={{animationDelay: '-2s'}}>
                                        <div className="w-32 h-20 glass rounded-lg schema-gradient-border shadow-lg overflow-hidden">
                                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-foreground text-xs px-2 py-1 font-medium border-b border-border/10">Doctors</div>
                                            <div className="px-2 py-1 space-y-1">
                                                <div className="h-1.5 w-20 bg-foreground/30 rounded"></div>
                                                <div className="h-1.5 w-16 bg-foreground/20 rounded"></div>
                                                <div className="h-1.5 w-24 bg-foreground/20 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                         <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center ring-1 ring-inset ring-orange-500/20">
                                         <Shield className="h-6 w-6 text-orange-400" />
                                     </div>
                                <h3 className="text-2xl font-semibold font-headline text-foreground">Proactive Security</h3>
                            </div>
                            <p className="text-muted-foreground text-lg mb-4">Beyond compliance, Orelis will offer proactive threat detection and data encryption that sets a new industry standard, ensuring patient data is secure against tomorrow's threats.</p>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center ring-1 ring-inset ring-orange-500/20">
                                     <Tablet className="h-6 w-6 text-orange-400" />
                                 </div>
                                <h3 className="text-2xl font-semibold font-headline text-foreground">Unified Accessibility</h3>
                            </div>
                            <p className="text-muted-foreground text-lg mb-4">Orelis will be accessible on any device, anywhere. But our vision is a unified platform where patient data from wearables and other sources integrates seamlessly, providing a holistic view of patient health.</p>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center ring-1 ring-inset ring-orange-500/20">
                                     <LineChart className="h-6 w-6 text-orange-400" />
                                  </div>
                                <h3 className="text-2xl font-semibold font-headline text-foreground">Predictive Intelligence</h3>
                            </div>
                            <p className="text-muted-foreground text-lg">Our analytics will evolve from reporting to predicting. Orelis will identify at-risk patients, forecast resource needs, and suggest operational improvements, turning data into decisive action.</p>
                        </div>

                    </div>
                </div>
            </div>
        </section>


        {/* Testimonial Section */}
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border noisy-bg [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
                  <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)]"></div>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.18] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background"></div>
                  </div>
                  <div className="relative p-8 text-left sm:p-16">
                      <div className="[animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll text-left max-w-3xl mb-16">
                          <div className="inline-flex text-[13px] font-medium text-orange-300 rounded-none ring-0 mb-6 pt-1.5 pr-3.5 pb-1.5 pl-3.5 gap-x-2 gap-y-2 items-center">
                          <span className="tabular-nums text-2xl font-light text-orange-300/80">02</span>
                          <span className="text-orange-300/40">/</span>
                          <span className="uppercase text-[11px] text-orange-200/90 tracking-widest">Testimonials</span>
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
                                  <Image src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?q=80&w=1080&auto=format&fit=crop" alt="Customer portrait" layout="fill" objectFit="cover" className="opacity-100"/>
                              </div>
                              <div className="flex flex-col sm:p-10 [animation:fadeSlideIn_0.8s_ease-out_0.3s_both] animate-on-scroll text-left bg-card ring-1 ring-border pt-8 pr-8 pb-8 pl-8 relative justify-center">
                                  <div className="mb-4">
                                  <Quote className="h-8 w-8 text-orange-400" />
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
                              <div className="flex flex-col text-left bg-card border border-border pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
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
                              <div className="flex flex-col text-left bg-card border border-border pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
                                  <p className="leading-relaxed text-base text-muted-foreground">
                                  "Patient management is seamless, and the platform is so intuitive. Our team was onboarded in less than a day."
                                  </p>
                                  <div className="flex gap-3 mt-6 gap-x-3 gap-y-3 items-center">
                                  <Image src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=320&auto=format&fit=crop" alt="Emily Roberts avatar" width={40} height={40} className="h-10 w-10 object-cover ring-1 ring-border"/>
                                  <div>
                                      <div className="text-foreground text-sm font-medium">Dr. Emily Roberts</div>
                                      <div className="text-muted-foreground text-xs">Lead Physician @ HealthSync</div>
                                  </div>
                                  </div>
                              </div>
                              <div className="flex flex-col text-left bg-card border border-border pt-6 pr-6 pb-6 pl-6 justify-between overflow-hidden relative">
                                  <p className="text-muted-foreground text-base leading-relaxed">
                                  "The security and reliability are top-notch. We trust Orelis with our most sensitive patient data without a second thought."
                                  </p>
                                  <div className="flex items-center gap-3 mt-6">
                                  <Image src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=320&auto=format&fit=crop" alt="David Park avatar" width={40} height={40} className="h-10 w-10 object-cover ring-1 ring-border"/>
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

        {/* Get Started */}
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll relative mt-6 overflow-hidden border border-dashed border-border p-8 sm:p-16 noisy-bg card-glow [animation:fadeSlideIn_0.8s_ease-out_0.1s_both]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(59,130,246,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.18] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background"></div>
              </div>
              <div className="relative mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-[13px] font-medium text-orange-300 ring-0">
                  <span className="text-2xl font-light text-orange-300/80 tabular-nums">
                    03
                  </span>
                  <span className="text-orange-300/40">/</span>
                  <span className="text-[11px] uppercase tracking-widest text-orange-200/90">
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
                  <Link href="/pricing" className="contact-button">
                    Request a Demo
                  </Link>
                  <Link
                    href="/features"
                    className="inline-flex items-center justify-center overflow-hidden bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition"
                  >
                    Explore Features
                  </Link>
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
