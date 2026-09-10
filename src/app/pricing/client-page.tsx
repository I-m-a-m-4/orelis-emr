'use client';

import { useState } from 'react';
import { Check, X, Zap, Shield, Building2, ChevronDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CYCLE_OPTIONS = [
  { label: '1 Month', months: 1, discount: 0 },
  { label: '3 Months', months: 3, discount: 0.05 },
  { label: '6 Months', months: 6, discount: 0.10 },
  { label: '1 Year', months: 12, discount: 0.15 },
];

const PLANS = [
  {
    id: 'pro',
    name: 'Pro Clinic',
    tagline: 'Standard full-featured tier for medical practices and outpatient clinics',
    monthlyPrice: 20000,
    icon: Zap,
    cta: 'Start 30-Day Free Trial',
    ctaHref: '/signup/clinic',
    featured: true,
    badge: '30-Day Free Trial Included',
    features: [
      'Automatic 30-day free trial on signup',
      'Unlimited patient records and registrations',
      'Full clinical SOAP encounters and history',
      'Prescriptions and pharmacy inventory tracking',
      'Laboratory investigation orders and results',
      'Inpatient ward and bed capacity tracking',
      'Staff role-based access (Doctor, Nurse, Receptionist)',
      '100% offline-first synchronization',
      'Automated patient billing and PDF receipts',
    ],
    notIncluded: [
      'Multi-ward real-time ICU allocation',
      'Telehealth video consultations',
      'Priority 24/7 SLA telephone support',
    ],
  },
  {
    id: 'hospital',
    name: 'Hospital Enterprise',
    tagline: 'Comprehensive solution for multi-department hospitals and centres',
    monthlyPrice: 50000,
    icon: Building2,
    cta: 'Select Hospital Plan',
    ctaHref: '/signup/clinic?plan=hospital',
    featured: false,
    badge: 'Multi-Department Ready',
    features: [
      'Everything included in Pro Clinic',
      'Unlimited wards, departments, and beds',
      'Real-time inpatient admission and bed tracking',
      'Integrated telehealth video consultations',
      'Automated clinical billing and insurance invoicing',
      'Longitudinal clinical risk radar and analytics',
      'Advanced staff audit logging and compliance tracking',
      'Priority 24/7 dedicated support and SLA',
      'Custom report builder and Excel/PDF data export',
    ],
    notIncluded: [],
  },
  {
    id: 'institutional',
    name: 'Institutional Network',
    tagline: 'Custom infrastructure for hospital groups and government health networks',
    monthlyPrice: null,
    icon: Shield,
    cta: 'Contact Medical Sales',
    ctaHref: '/contact',
    featured: false,
    badge: 'Custom Architecture',
    features: [
      'Everything in Hospital Enterprise',
      'Multi-branch federation and centralized registry',
      'Custom Electronic Health Record (EHR) integrations',
      'Dedicated compliance and onboarding manager',
      '99.99% uptime guarantee with enterprise BAA',
      'On-premise or sovereign private cloud deployment',
      'Custom data migration from legacy paper/systems',
      'Staff on-site training and certification workshops',
    ],
    notIncluded: [],
  },
];

const COMPARISON_ROWS = [
  { label: '30-Day Free Trial on Signup', pro: true, hospital: true, institutional: true },
  { label: 'Patient Registrations', pro: 'Unlimited', hospital: 'Unlimited', institutional: 'Unlimited' },
  { label: 'Clinical SOAP Charting', pro: true, hospital: true, institutional: true },
  { label: 'Prescriptions & Pharmacy Inventory', pro: true, hospital: true, institutional: true },
  { label: 'Lab Orders & Diagnostic Results', pro: true, hospital: true, institutional: true },
  { label: 'Basic Inpatient Ward Tracking', pro: true, hospital: true, institutional: true },
  { label: 'Multi-Ward & ICU Real-time Beds', pro: false, hospital: true, institutional: true },
  { label: 'Telehealth Video Consultations', pro: false, hospital: true, institutional: true },
  { label: 'Offline-First Local Sync', pro: true, hospital: true, institutional: true },
  { label: 'Automated Billing & PDF Invoices', pro: true, hospital: true, institutional: true },
  { label: 'Clinical Risk Radar & Analytics', pro: false, hospital: true, institutional: true },
  { label: 'Multi-Branch Hospital Federation', pro: false, hospital: false, institutional: true },
  { label: 'Dedicated Support & SLA Guarantee', pro: 'Standard Support', hospital: 'Priority 24/7 SLA', institutional: 'Dedicated Account Team' },
];

const FAQS = [
  {
    q: 'How does the 30-day free trial work?',
    a: 'Every newly registered clinic automatically receives 30 days of unrestricted access to the Pro Clinic plan upon completing onboarding. No payment details are required to begin charting and managing patients.',
  },
  {
    q: 'What happens when my 30-day trial ends?',
    a: 'If your 30-day trial expires without an active subscription, your workspace switches to Read-Only Mode. All existing patient charts, medical histories, and invoices remain completely intact and searchable. To create new records, encounters, or prescriptions, simply activate your subscription on the Billing page.',
  },
  {
    q: 'Can we switch between Pro and Hospital Enterprise at any time?',
    a: 'Yes. Upgrades apply immediately with prorated billing. You can adjust your billing cycle (1 month, 3 months, 6 months, or 1 year) whenever your operational needs change.',
  },
  {
    q: 'What payment methods are supported in Nigeria and internationally?',
    a: 'We accept debit cards, bank transfers, USSD, and Apple Pay through our secure Paystack integration in Nigerian Naira (NGN). International cards in USD are also accepted.',
  },
  {
    q: 'Is our medical data safe and compliant?',
    a: 'Yes. All clinical observations, vitals, and patient records are encrypted both in transit and at rest on Google Cloud. Strict multi-tenant row-level access rules guarantee that each hospital only sees its own data.',
  },
  {
    q: 'Do you offer custom setups for teaching hospitals and state health boards?',
    a: 'Yes. Our Institutional plan supports multi-facility federated registries, on-premise local server deployments, and custom data migration from paper records. Contact our team for an enterprise consultation.',
  },
];

function CellVal({ val }: { val: boolean | string }) {
  if (val === true) return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-xs font-semibold text-foreground">{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold hover:text-primary transition-colors gap-4"
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

export function PricingClientPage() {
  const [cycleIdx, setCycleIdx] = useState(0);
  const cycle = CYCLE_OPTIONS[cycleIdx];

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1 pt-16">
        {/* Header Hero */}
        <section className="py-20 md:py-28 text-center border-b border-border/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary mb-4 font-semibold text-xs px-3 py-1">
              Transparent Medical Practice Pricing
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-headline">
              Predictable Pricing for Healthcare Facilities
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every clinic enjoys a 30-day complimentary trial on the Pro Plan. No credit card required to start charting patient records.
            </p>

            {/* Billing Cycle Switcher */}
            <div className="mt-10 flex justify-center">
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm">
                {CYCLE_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCycleIdx(i)}
                    className={cn(
                      'relative rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                      cycleIdx === i
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                    {opt.discount > 0 && (
                      <span className="ml-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-black">
                        -{opt.discount * 100}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const total = plan.monthlyPrice
                  ? Math.round(plan.monthlyPrice * cycle.months * (1 - cycle.discount))
                  : null;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative flex flex-col justify-between rounded-2xl border p-8 bg-card shadow-sm transition-all',
                      plan.featured
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.015]'
                        : 'border-border/70 hover:border-border'
                    )}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-8">
                        <Badge
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 shadow-sm',
                            plan.featured
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground border'
                          )}
                        >
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">{plan.tagline}</p>
                        </div>
                      </div>

                      {/* Price Tag */}
                      <div className="my-6 p-4 rounded-xl bg-muted/40 border border-border/50">
                        {total !== null ? (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl md:text-4xl font-black">
                                ₦{total.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {cycle.months === 1 ? 'month' : `${cycle.months} months`}
                              </span>
                            </div>
                            {cycle.discount > 0 && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                Saves {(plan.monthlyPrice! * cycle.months * cycle.discount).toLocaleString()} NGN on this cycle
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="py-2">
                            <span className="text-2xl md:text-3xl font-black">Custom Pricing</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Contact us for institutional volume licensing</p>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          What is included
                        </p>
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-foreground/90">
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 mt-8 border-t">
                      <Button
                        asChild
                        variant={plan.featured ? 'default' : 'outline'}
                        className="w-full h-11 font-bold text-sm shadow-sm gap-2"
                      >
                        <Link href={plan.ctaHref}>
                          {plan.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section className="py-16 border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold font-headline">Compare System Capabilities</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed breakdown of operational and clinical tools across each plan tier.
              </p>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-4 px-6 font-bold">Feature</th>
                      <th className="py-4 px-4 text-center font-bold">Pro Clinic</th>
                      <th className="py-4 px-4 text-center font-bold">Hospital</th>
                      <th className="py-4 px-4 text-center font-bold">Institutional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-6 text-xs md:text-sm font-medium">{row.label}</td>
                        <td className="py-3 px-4 text-center">
                          <CellVal val={row.pro} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <CellVal val={row.hospital} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <CellVal val={row.institutional} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-border/60">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold font-headline">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Everything you need to know about Orelis EMR licensing and billing.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
              {FAQS.map((faq, i) => (
                <FaqItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
