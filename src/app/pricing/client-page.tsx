
'use client';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';

export function PricingClientPage() {
  return (
    <div className="bg-background text-foreground">
       <PublicHeader />

      <main className="noisy-bg pt-16">
        <section className="relative py-24 xl:py-32">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl font-headline">
              Pricing Plans
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Choose the plan that's right for your practice. Simple, transparent pricing with no hidden fees.
            </p>
          </div>
        </section>

        <section className="relative pb-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Plan 1: Starter */}
                    <div className="relative overflow-hidden border border-dashed border-border p-8 noisy-bg">
                         <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.03]"></div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground font-headline">Starter</h3>
                                <p className="mt-4 text-muted-foreground">For small practices and solo practitioners getting started.</p>
                                <p className="mt-8 text-4xl font-bold text-foreground">₦25,000 <span className="text-xl font-normal text-muted-foreground">/mo</span></p>
                                <ul className="mt-8 space-y-4 text-muted-foreground">
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Up to 500 Patients</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Appointment Scheduling</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Basic Reporting</li>
                                </ul>
                            </div>
                            <Link href="/signup" className="contact-button mt-8 w-full text-center">Get Started</Link>
                        </div>
                    </div>

                    {/* Plan 2: Pro (Featured) */}
                    <div className="relative overflow-hidden border border-dashed border-orange-400/50 p-8 noisy-bg card-glow">
                         <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.03]"></div>
                         <div className="absolute top-0 right-0 m-4">
                            <div className="rounded-full bg-orange-400/10 px-3 py-1 text-sm font-medium text-orange-300">Most Popular</div>
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <h3 className="text-2xl font-semibold text-orange-300 font-headline">Pro</h3>
                                <p className="mt-4 text-muted-foreground">For growing practices that need more power and features.</p>
                                <p className="mt-8 text-4xl font-bold text-foreground">₦50,000 <span className="text-xl font-normal text-muted-foreground">/mo</span></p>
                                <ul className="mt-8 space-y-4 text-muted-foreground">
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Up to 2,000 Patients</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> AI-Powered Reminders</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Advanced Reporting</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Priority Support</li>
                                </ul>
                            </div>
                             <Link href="/signup" className="mt-8 inline-flex items-center justify-center overflow-hidden bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition w-full">
                                Choose Plan
                            </Link>
                        </div>
                    </div>

                    {/* Plan 3: Enterprise */}
                    <div className="relative overflow-hidden border border-dashed border-border p-8 noisy-bg">
                         <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.03]"></div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground font-headline">Enterprise</h3>
                                <p className="mt-4 text-muted-foreground">For large hospitals and healthcare systems with custom needs.</p>
                                <p className="mt-8 text-4xl font-bold text-foreground">Custom</p>
                                <ul className="mt-8 space-y-4 text-muted-foreground">
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Unlimited Patients</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Custom Integrations</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> Dedicated Account Manager</li>
                                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-orange-400" /> HIPAA Compliance</li>
                                </ul>
                            </div>
                            <Link href="/contact" className="contact-button mt-8 w-full text-center">Contact Sales</Link>
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
