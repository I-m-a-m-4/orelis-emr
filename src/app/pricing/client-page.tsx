
'use client';

import { useState } from 'react';
import { Check, X, Zap, Shield, Building2, Crown, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';
import { cn } from '@/lib/utils';

// ─── Pricing Data ─────────────────────────────────────────────────────────────

const CYCLE_OPTIONS = [
  { label: '1 Month', months: 1, discount: 0 },
  { label: '3 Months', months: 3, discount: 0.05 },
  { label: '6 Months', months: 6, discount: 0.10 },
  { label: '1 Year', months: 12, discount: 0.15 },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo practitioners & small clinics',
    monthlyPrice: 15000 as number | null,
    icon: Zap,
    color: 'text-sky-400',
    borderColor: 'border-sky-400/30',
    bgColor: 'bg-sky-500/5',
    cta: 'Get Started',
    ctaHref: '/signup',
    featured: false,
    features: [
      'Up to 300 patients',
      'Up to 3 staff accounts',
      'Appointment scheduling',
      'Clinical SOAP encounters',
      'Prescription management',
      'Patient invoicing & receipts',
      'Basic reports',
      'Orelis AI — 50 credits/mo',
    ],
    notIncluded: [
      'Lab orders & results',
      'Pharmacy & medication inventory',
      'Ward & bed management',
      'Offline-first sync',
    ],
  },
  {
    id: 'clinic',
    name: 'Clinic',
    tagline: 'For growing multi-doctor practices',
    monthlyPrice: 35000 as number | null,
    icon: Shield,
    color: 'text-orange-400',
    borderColor: 'border-orange-400/50',
    bgColor: 'bg-orange-500/5',
    cta: 'Choose Clinic',
    ctaHref: '/signup?plan=clinic',
    featured: true,
    features: [
      'Up to 2,000 patients',
      'Up to 15 staff accounts',
      'Everything in Starter',
      'Lab orders & results management',
      'Pharmacy & medication inventory',
      'Waitlist & bed/ward management',
      'Offline-first sync',
      'Staff RBAC permissions',
      'Audit log',
      'Orelis AI — 200 credits/mo',
    ],
    notIncluded: [
      'Telehealth video consultations',
      'Multi-branch management',
    ],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    tagline: 'For full-service hospitals & departments',
    monthlyPrice: 75000 as number | null,
    icon: Building2,
    color: 'text-violet-400',
    borderColor: 'border-violet-400/30',
    bgColor: 'bg-violet-500/5',
    cta: 'Choose Hospital',
    ctaHref: '/signup?plan=hospital',
    featured: false,
    features: [
      'Unlimited patients & staff',
      'Everything in Clinic',
      'Full inpatient & admission management',
      'Multi-ward management',
      'Telehealth video consultations',
      'Patient portal access',
      'Advanced analytics & reports',
      'Orelis AI — Unlimited credits',
      'Priority support',
    ],
    notIncluded: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For government hospitals & multi-branch chains',
    monthlyPrice: null,
    icon: Crown,
    color: 'text-amber-400',
    borderColor: 'border-amber-400/30',
    bgColor: 'bg-amber-500/5',
    cta: 'Contact Sales',
    ctaHref: '/contact',
    featured: false,
    features: [
      'Everything in Hospital',
      'Multi-branch management',
      'Custom API integrations',
      'Dedicated onboarding manager',
      'SLA guarantee',
      'Custom AI model tuning',
      'On-premise deployment option',
      'Government compliance reporting',
    ],
    notIncluded: [],
  },
];

const COMPARISON_ROWS = [
  { label: 'Patients', starter: '300', clinic: '2,000', hospital: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Staff accounts', starter: '3', clinic: '15', hospital: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Appointments & scheduling', starter: true, clinic: true, hospital: true, enterprise: true },
  { label: 'SOAP encounters & prescriptions', starter: true, clinic: true, hospital: true, enterprise: true },
  { label: 'Patient invoicing', starter: true, clinic: true, hospital: true, enterprise: true },
  { label: 'Lab orders & results', starter: false, clinic: true, hospital: true, enterprise: true },
  { label: 'Pharmacy & medications', starter: false, clinic: true, hospital: true, enterprise: true },
  { label: 'Ward & bed management', starter: false, clinic: true, hospital: true, enterprise: true },
  { label: 'Offline-first sync', starter: false, clinic: true, hospital: true, enterprise: true },
  { label: 'Staff RBAC & audit log', starter: false, clinic: true, hospital: true, enterprise: true },
  { label: 'Admission & inpatient', starter: false, clinic: false, hospital: true, enterprise: true },
  { label: 'Telehealth video', starter: false, clinic: false, hospital: true, enterprise: true },
  { label: 'Patient portal', starter: false, clinic: false, hospital: true, enterprise: true },
  { label: 'Orelis AI credits', starter: '50/mo', clinic: '200/mo', hospital: 'Unlimited', enterprise: 'Custom' },
  { label: 'Multi-branch management', starter: false, clinic: false, hospital: false, enterprise: true },
  { label: 'Dedicated onboarding', starter: false, clinic: false, hospital: false, enterprise: true },
  { label: 'SLA guarantee', starter: false, clinic: false, hospital: false, enterprise: true },
];

const FAQS = [
  { q: 'Can I switch plans at any time?', a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of the current billing period. No data is lost.' },
  { q: 'Is there a free trial?', a: "We offer a 14-day full-feature demo for new clinics. Contact our team and we'll set you up instantly." },
  { q: 'What happens when I reach my patient limit?', a: "Existing records remain fully accessible. You just won't register new patients until you upgrade — we'll notify you at 80% and 100% of your limit." },
  { q: 'What are Orelis AI credits?', a: 'Credits power AI features: SOAP note generation, drug interaction checks, triage assistance, and diagnostic suggestions. Each action consumes credits based on complexity.' },
  { q: 'Is patient data safe?', a: 'All data is encrypted at rest and in transit on Google Cloud infrastructure. Strict security rules and RBAC ensure only authorised staff access patient records.' },
  { q: 'Do you support government hospitals?', a: 'Yes. Our Enterprise plan includes on-premise deployment, government compliance reporting, and a dedicated onboarding team. Contact us for a quote.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string { return `\u20a6${n.toLocaleString()}`; }

function CellVal({ val }: { val: boolean | string }) {
  if (val === true) return <Check className="h-4 w-4 text-emerald-500 mx-auto" />;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-xs font-semibold">{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold hover:text-primary transition-colors gap-4">
        <span>{q}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PricingClientPage() {
  const [cycleIdx, setCycleIdx] = useState(0);
  const cycle = CYCLE_OPTIONS[cycleIdx];

  return (
    <div className="bg-background text-foreground">
      <PublicHeader />

      <main className="noisy-bg pt-16">

        {/* Hero */}
        <section className="relative py-24 xl:py-32 text-center">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
              <Zap className="h-3.5 w-3.5" /> Transparent, clinic-first pricing
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl font-headline">
              Plans that grow<br />with your practice
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-xl mx-auto">
              From solo GP to 200-bed hospital. No hidden fees, no per-doctor surcharges — one clear subscription for your whole clinic.
            </p>
          </div>
        </section>

        {/* Billing cycle toggle */}
        <div className="flex justify-center px-4 mb-10">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {CYCLE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setCycleIdx(i)}
                className={cn(
                  'relative rounded-lg px-4 py-2 text-xs font-bold transition-all',
                  cycleIdx === i ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
                {opt.discount > 0 && (
                  <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-500">
                    -{opt.discount * 100}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <section className="relative pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const total = plan.monthlyPrice
                  ? Math.round(plan.monthlyPrice * cycle.months * (1 - cycle.discount))
                  : null;
                const perMonth = plan.monthlyPrice && cycle.months > 1
                  ? Math.round(total! / cycle.months)
                  : plan.monthlyPrice;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative flex flex-col rounded-2xl border p-7 overflow-hidden transition-transform hover:-translate-y-1',
                      plan.borderColor, plan.bgColor,
                      plan.featured && 'ring-2 ring-orange-400/60 shadow-xl shadow-orange-500/10'
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.025]" />

                    {plan.featured && (
                      <div className="absolute top-4 right-4 rounded-full bg-orange-400/15 px-3 py-1 text-[10px] font-black text-orange-400 uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}

                    <div className={cn('mb-4 w-fit rounded-xl border p-2.5', plan.borderColor, plan.bgColor)}>
                      <Icon className={cn('h-5 w-5', plan.color)} />
                    </div>

                    <h3 className={cn('text-xl font-black font-headline', plan.color)}>{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">{plan.tagline}</p>

                    <div className="mt-6">
                      {plan.monthlyPrice ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-foreground">{fmt(perMonth!)}</span>
                            <span className="text-sm text-muted-foreground font-medium">/mo</span>
                          </div>
                          {cycle.months > 1 && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Billed {fmt(total!)} every {cycle.months} months
                              {cycle.discount > 0 && <span className="ml-1 font-bold text-emerald-500">(save {cycle.discount * 100}%)</span>}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-4xl font-black text-foreground">Custom</div>
                      )}
                    </div>

                    <Link
                      href={plan.ctaHref}
                      className={cn(
                        'mt-6 inline-flex items-center justify-center rounded-xl py-2.5 px-4 text-sm font-bold transition-all',
                        plan.featured
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border bg-background/60 hover:bg-background text-foreground'
                      )}
                    >
                      {plan.cta}
                    </Link>

                    <ul className="mt-6 space-y-2.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <Check className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', plan.color)} />
                          {f}
                        </li>
                      ))}
                      {plan.notIncluded.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground/35 line-through">
                          <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="py-16 border-t border-border/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black font-headline">Compare all features</h2>
              <p className="text-sm text-muted-foreground mt-2">See exactly what's included in each plan.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 text-left font-semibold text-muted-foreground w-52">Feature</th>
                    {PLANS.map(p => (
                      <th key={p.id} className={cn('py-3 text-center font-black text-sm', p.color)}>{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.label} className={cn('border-b border-border/40', i % 2 === 0 && 'bg-muted/20')}>
                      <td className="py-3 text-xs text-muted-foreground font-medium pr-4">{row.label}</td>
                      <td className="py-3 text-center"><CellVal val={row.starter} /></td>
                      <td className="py-3 text-center"><CellVal val={row.clinic} /></td>
                      <td className="py-3 text-center"><CellVal val={row.hospital} /></td>
                      <td className="py-3 text-center"><CellVal val={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 border-t border-border/40">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black font-headline">Frequently asked questions</h2>
            </div>
            {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 border-t border-border/40 text-center">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="text-3xl font-black font-headline">Ready to digitise your clinic?</h2>
            <p className="text-muted-foreground mt-3 text-sm">Join hospitals already using Orelis to deliver faster, safer care.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link href="/signup" className="contact-button px-8 py-3">Start Free Trial</Link>
              <Link href="/contact" className="inline-flex items-center justify-center border border-border rounded-lg px-8 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors">
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
