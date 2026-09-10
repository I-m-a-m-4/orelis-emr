'use client';

import React from 'react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PrivacyPage() {
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
              Data Protection & Compliance
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective Date: January 1, 2026 | Last Updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 prose dark:prose-invert max-w-none">
            <h2>1. Our Commitment to Healthcare Privacy</h2>
            <p>
              At Orelis, we recognize that patient health information (PHI) and clinical records represent the most sensitive categories of data.
              This Privacy Policy explains how personal and medical data is gathered, processed, and safeguarded when your medical facility uses the Orelis platform.
            </p>

            <h2>2. Information Collected</h2>
            <p>
              We collect information strictly necessary to provide hospital operations and clinical record charting:
            </p>
            <ul>
              <li><strong>Practitioner Account Details:</strong> Full name, professional medical license, institutional email address, facility name, and role.</li>
              <li><strong>Patient Health Information:</strong> Patient demographics, contact numbers, next-of-kin contacts, clinical SOAP notes, vital observations, laboratory test orders, and prescription histories.</li>
              <li><strong>Financial & Invoicing Data:</strong> Invoice totals, line-item clinical services, and payment confirmation tokens processed securely via Paystack. We do not store raw credit card numbers.</li>
            </ul>

            <h2>3. Healthcare Data Ownership & Zero Data Commercialization</h2>
            <p>
              <strong>We do not sell, rent, monetize, or trade patient health records to pharmaceutical companies, advertisers, or third-party data brokers.</strong>
              All clinical records uploaded or created by your clinic remain under the exclusive custody and legal ownership of your medical facility.
            </p>

            <h2>4. Security Standards & Data Encryption</h2>
            <p>
              Orelis applies rigorous enterprise security controls:
            </p>
            <ul>
              <li><strong>Encryption in Transit:</strong> All HTTP communications are strictly enforced via Transport Layer Security (TLS 1.3).</li>
              <li><strong>Encryption at Rest:</strong> Cloud databases and document stores use AES-256 bit encryption.</li>
              <li><strong>Multi-Tenant Isolation:</strong> Firestore database security rules enforce cryptographic, role-based boundary separation between clinics.</li>
              <li><strong>Audit Trails:</strong> Staff interactions, record modifications, and patient data downloads are logged in immutable audit records.</li>
            </ul>

            <h2>5. Nigeria Data Protection Regulation (NDPR) & Global Standards</h2>
            <p>
              Orelis adheres to the principles of the Nigeria Data Protection Act (NDPA) and international healthcare data privacy standards.
              Data subjects (patients) have the right through their registered hospital to request access, correction, or export of their health records.
            </p>

            <h2>6. Data Retention & Portability</h2>
            <p>
              Your facility may export its full patient registry, encounter histories, and invoicing ledgers at any time.
              Upon formal written request for workspace deletion, all associated tenant database records are permanently purged after a 30-day safety grace period.
            </p>

            <h2>7. Privacy Inquiries & Data Protection Officer</h2>
            <p>
              If you have questions regarding data privacy, compliance auditing, or data processing agreements, please reach out to our Data Protection Officer:
              <br />
              <a href="mailto:privacy@orelis.app" className="text-primary font-semibold">privacy@orelis.app</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
