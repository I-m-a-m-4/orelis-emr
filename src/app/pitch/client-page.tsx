
'use client';
import {
  ArrowRight,
  BarChart,
  Target,
  Users,
  DollarSign,
  HeartPulse,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import { Button } from '@/components/ui/button';

const slides = [
  {
    title: 'The Problem: A Digital Divide in Healthcare',
    content:
      'Private clinics in emerging markets are drowning in paperwork. Manual records lead to inefficiency, lost revenue from patient no-shows, and a critical lack of data for making informed decisions. This operational drag prevents them from growing and delivering the best possible care.',
    icon: HeartPulse,
  },
  {
    title: 'The Solution: An OS for the Modern Clinic',
    content:
      'Orelis is a simple, offline-first E-Health platform that helps clinics go digital. We provide secure patient records, smart appointment scheduling, and AI-powered reminders to reduce no-shows. It’s one platform to manage the entire clinic, designed for the realities of markets with unreliable internet.',
    icon: Sparkles,
  },
  {
    title: 'Why Now? The Tipping Point',
    content:
      'Digital transformation in healthcare is no longer optional. Patients expect modern convenience, and clinics need to operate efficiently to survive. With growing internet penetration, the demand for a robust, offline-capable solution has never been higher. The market is ready for a purpose-built tool that understands its unique challenges.',
    icon: Zap,
  },
  {
    title: 'Target Market: A Massive, Underserved Segment',
    content:
      'Our focus is on the thousands of small-to-medium private clinics in Nigeria and other African markets. This is a massive, underserved segment still relying on outdated methods. We estimate a Serviceable Obtainable Market (SOM) of over 5,000 clinics in Nigeria alone within the first three years.',
    icon: Target,
  },
  {
    title: 'Business Model: Simple & Scalable SaaS',
    content:
      'We offer a clear, tiered subscription model (SaaS) based on the number of patients and staff. A free trial allows clinics to experience the value firsthand, leading to high conversion rates. Our Pro plan is priced competitively at ₦50,000/month, providing an affordable entry point for practices of all sizes.',
    icon: DollarSign,
  },
  {
    title: 'The Team: Vision & Expertise',
    content:
      "We are a lean team of passionate developers and healthcare advocates with deep expertise in building scalable software for emerging markets. Our vision is to empower clinicians with technology that is both powerful and incredibly easy to use. We understand the landscape and are uniquely positioned to win this market.",
    icon: Users,
  },
  {
    title: 'The Ask: Fueling Our Growth',
    content:
      'We are seeking ₦50,000,000 to achieve three key milestones over the next 18 months: 1) Onboard our first 100 paying clinics through a targeted sales and marketing push. 2) Expand our engineering team to accelerate product development, focusing on analytics and telemedicine integrations. 3) Establish key partnerships with healthcare associations in Nigeria.',
    icon: BarChart,
  },
];

export function PitchClientPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  // `HTMLElement`, not `HTMLDivElement`: these refs are attached to `<section>`
  // elements. The refs below also use block bodies — a concise arrow returns the
  // assigned element, and React reads a ref callback's return value as a cleanup
  // function, so returning a DOM node makes React try to call it on unmount.
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setCurrentSlide(index);
          }
        });
      },
      { threshold: 0.6 }
    );

    slideRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      slideRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  return (
    <div className="bg-background text-foreground pitch-deck transition-colors duration-300">
      <PublicHeader />

      <main className="pt-16">
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/50 border border-dashed border-border backdrop-blur-md p-2 rounded-full">
            {slides.map((_, i) => (
                <button
                    key={i}
                    onClick={() => slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' })}
                    className={`w-2 h-2 rounded-full transition-all ${currentSlide === i ? 'bg-primary w-6' : 'bg-muted-foreground/30'}`}
                />
            ))}
        </div>

        {/* Title Slide */}
        <section
          ref={(el) => { slideRefs.current[0] = el; }}
          data-index={0}
          className="h-screen flex flex-col justify-center items-center text-center p-8 noisy-bg relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_120%,rgba(16,185,129,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow" />
          <div className="z-10">
            <div className="inline-block mb-8">
              <OrelisLogo />
            </div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tighter text-foreground font-headline">
              The Operating System for Modern Clinics
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground">
              From Pen & Paper to AI-Powered.
            </p>
          </div>
        </section>

        {/* Content Slides */}
        {slides.map((slide, index) => (
          <section
            key={index}
            ref={(el) => { slideRefs.current[index + 1] = el; }}
            data-index={index + 1}
            className="h-screen flex items-center justify-center p-8 noisy-bg"
          >
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left flex justify-center">
                 <div className="w-48 h-48 rounded-full bg-primary/5 flex items-center justify-center ring-4 ring-dashed ring-primary/10">
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-dashed ring-primary/20">
                        <slide.icon className="w-16 h-16 text-primary" />
                    </div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-light tracking-tight text-primary font-headline mb-6">
                  {slide.title}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {slide.content}
                </p>
              </div>
            </div>
          </section>
        ))}

         {/* Contact Slide */}
         <section ref={(el) => { slideRefs.current[slides.length + 1] = el; }} data-index={slides.length + 1} className="h-screen flex flex-col justify-center items-center text-center p-8 noisy-bg relative">
            <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_120%,rgba(16,185,129,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow"/>
            <div className="z-10">
                <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground font-headline mb-6">Let's Build the Future of African Healthcare.</h2>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">Thank You. Let's Talk.</p>
                <p className="text-lg text-primary font-semibold">[Your Name]</p>
                <p className="text-md text-muted-foreground">[Your Title]</p>
                <p className="text-md text-muted-foreground">[Your Email]</p>
                <p className="text-md text-muted-foreground">[Your Phone Number]</p>
                <Button asChild className="mt-8">
                    <Link href="/">Back to Homepage <ArrowRight className="ml-2"/></Link>
                </Button>
            </div>
        </section>
      </main>

      <style jsx>{`
        .pitch-deck {
            scroll-snap-type: y mandatory;
            overflow-y: scroll;
            height: 100vh;
        }
        section {
            scroll-snap-align: start;
            scroll-snap-stop: always;
        }
      `}</style>
    </div>
  );
}
