'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { Play, Sparkles, Activity, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

export default function DemoVideoPage() {
  return (
    <div className="bg-background text-foreground transition-colors duration-300 min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-grow pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 animate-pulse">
              <Sparkles className="h-3 w-3" />
              Ontomorph Hackathon Submission
            </span>
            <h1 className="mt-4 font-headline text-3xl font-light tracking-tight sm:text-4xl md:text-5xl text-foreground">
              Orelis EMR Platform Demo
            </h1>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Watch how Orelis integrates with the **Ontomorph Digital Twin Platform** and **HOLON Clinical Knowledge Graph** to power real-time diagnostics, drug safety screening, and predictive simulations.
            </p>
          </div>

          {/* Video Player Section */}
          <div className="relative rounded-2xl overflow-hidden border border-dashed border-border bg-card p-2 sm:p-4 shadow-2xl noisy-bg mb-16">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-inner">
              <video
                src="/orelis%20demo%20video.mp4"
                controls
                playsInline
                className="w-full h-full object-cover"
                poster="/emr.jpg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Integration Highlights */}
          <div className="grid gap-8 md:grid-cols-3">
            
            <div className="p-6 rounded-2xl border border-dashed border-border bg-card/45 hover:border-primary/40 transition-all duration-300">
              <div className="p-2.5 bg-primary/10 rounded-xl w-fit text-primary mb-4">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Digital Twin Telemetry</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Visualizes patient physiology across body systems like cardiovascular and respiratory, alerting clinicians to warnings like heart rate spikes immediately.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-dashed border-border bg-card/45 hover:border-primary/40 transition-all duration-300">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl w-fit text-emerald-500 dark:text-emerald-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">HOLON Drug Safety</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Screens drug lists against 1.7 million clinical interactions in real-time to alert doctors of critical medication risks directly within the editor.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-dashed border-border bg-card/45 hover:border-primary/40 transition-all duration-300">
              <div className="p-2.5 bg-blue-500/10 rounded-xl w-fit text-blue-500 dark:text-blue-400 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Lab Report Explainer</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Translates complex LOINC codes and dynamic ranges into clear, patient-friendly explanations, bridging the gap between clinical data and patient understanding.
              </p>
            </div>

          </div>

          {/* Call to action */}
          <div className="mt-16 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/95 transition">
              Back to Home page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
