'use client';

import React from 'react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';
import { ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1 pt-16">
        {/* Header Hero */}
        <section className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary mb-4 font-semibold text-xs px-3 py-1">
              Legal Documentation
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective Date: January 1, 2026 | Last Updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 prose dark:prose-invert max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of Orelis EMR ("Orelis," "we," "our," or "us"),
              an electronic medical records and clinic operating system provided to medical practitioners, clinics, and hospitals.
              By creating an account or accessing the platform, you agree to be bound by these Terms and our Privacy Policy.
            </p>

            <h2>2. Clinical Use and Professional Responsibility</h2>
            <p>
              Orelis is designed to assist qualified healthcare professionals in managing clinical records, patient consultations,
              pharmaceutical inventories, and ward bed allocations. Orelis does not provide medical diagnoses, treatment plans, or clinical
              advice. Healthcare providers remain solely responsible for all clinical decisions, prescription verifications, and patient care.
            </p>

            <h2>3. 30-Day Free Pro Trial and Subscription Billing</h2>
            <p>
              Every new clinic workspace receives a complimentary 30-day trial of our Pro Clinic plan upon registration.
              No payment card is required to begin the trial. During the 30-day period, the clinic enjoys unrestricted access to clinical charting,
              patient registries, and reporting tools.
            </p>
            <p>
              Upon the conclusion of the 30-day trial, the clinic workspace transitions to Read-Only Mode unless an active paid subscription
              is chosen. In Read-Only Mode, all past patient records, medical histories, and invoices remain fully searchable and downloadable.
              Creating new clinical records, encounters, and prescriptions requires an active subscription:
            </p>
            <ul>
              <li><strong>Pro Clinic Plan:</strong> ₦20,000 per month (or discounted multi-month billing cycles).</li>
              <li><strong>Hospital Enterprise Plan:</strong> ₦50,000 per month (or discounted multi-month billing cycles).</li>
            </ul>

            <h2>4. Patient Data Ownership and Security</h2>
            <p>
              Each healthcare facility retains 100% exclusive legal and operational ownership of its patient records, clinical notes,
              and health data. Orelis acts strictly as a data processor. All clinical observations are protected by multi-tenant
              row-level Firestore security rules and encrypted in transit and at rest on Google Cloud infrastructure.
            </p>

            <h2>5. Offline-First Capability and Data Synchronization</h2>
            <p>
              Orelis includes local storage synchronization enabling doctors to chart consultations during internet outages.
              You agree to ensure that devices running Orelis are physically secured and maintained with up-to-date operating system security patches.
            </p>

            <h2>6. Service Availability and Termination</h2>
            <p>
              You may terminate your account at any time. Prior to termination, administrators may export their clinical datasets in standard
              structured formats (JSON/CSV) and PDF medical summaries.
            </p>

            <h2>7. Contact and Inquiries</h2>
            <p>
              For legal inquiries regarding these Terms or enterprise Business Associate Agreements (BAA), please contact our legal counsel
              at <a href="mailto:legal@orelis.app" className="text-primary font-semibold">legal@orelis.app</a>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
