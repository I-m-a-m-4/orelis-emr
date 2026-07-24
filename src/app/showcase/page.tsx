'use client';

import { OrelisLogo } from '@/components/layout/orelis-logo';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

function OrelisBrandCard() {
  return (
    <div className="relative w-[400px] h-[300px] rounded-[10px] p-[1px] bg-custom-outer-orange overflow-hidden">
        <div className="star star1-orange"></div>
        <div className="star star2-orange"></div>
        <div className="star star3-orange"></div>
        <div className="star star4-orange"></div>
        <div className="star star5-orange"></div>
        
        <div className="absolute inset-0 grid-bg opacity-10 z-20"></div>

        <div className="relative w-full h-full rounded-[9px] border border-primary/20 bg-custom-card-orange flex flex-col justify-between text-white z-10 px-10 py-7">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.18] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black"></div>
          </div>
          
          <div className="absolute left-0 w-full h-[1px] line-topl-orange pointer-events-none" style={{ top: '10%' }}></div>
          <div className="absolute left-0 w-full h-[1px] bg-primary/20 pointer-events-none" style={{ bottom: '10%' }}></div>
          <div className="absolute top-0 h-full w-[1px] line-leftl-orange pointer-events-none" style={{ left: '10%' }}></div>
          <div className="absolute top-0 h-full w-[1px] bg-primary/20 pointer-events-none" style={{ right: '10%' }}></div>
          
          <div className="absolute w-[220px] h-[45px] rounded-full bg-primary opacity-30 shadow-[0_0_50px_hsl(var(--primary))] blur-[10px] left-0 top-0 pointer-events-none" style={{ transform: 'rotate(40deg)', transformOrigin: '10%' }}></div>
          
          <div className="relative flex flex-col flex-1 justify-center items-center gap-5 select-none mt-2 z-10">
            <OrelisLogo style={{ fontSize: 'clamp(48px, 12vw, 120px)', letterSpacing: '4px' }} />
          </div>
          
          <div className="relative absolute text-xs uppercase tracking-widest text-primary/70 font-light pointer-events-none z-10" style={{ right: '10%', bottom: '10%', paddingRight: '0.5rem', paddingBottom: '0.5rem' }}>
            HEALTHCARE
          </div>
        </div>
      </div>
  )
}

export default function ShowcasePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // Set loading time to 5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="bg-background text-foreground min-h-screen transition-colors duration-300">
      <header className="fixed top-0 z-50 w-full bg-background/60 backdrop-blur-lg border-b border-dashed border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="inline-flex items-center justify-center">
              <OrelisLogo />
            </Link>
            <Link href="/dashboard" className="px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 flex flex-col items-center justify-center min-h-screen">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-headline mb-4">Animation Showcase</h1>
            <p className="text-muted-foreground">A concept for the Orelis brand identity.</p>
          </div>

          <div className="flex items-center justify-center">
            <OrelisBrandCard />
          </div>
        </div>
      </main>
      <style jsx>{`
        /* Orelis Brand Card Styles */
        .gradient-text-orange {
          background: linear-gradient(45deg, hsl(var(--background)) 10%, hsl(var(--primary)) 50%, #059669 80%, hsl(var(--background)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          text-shadow: 0 0 15px hsla(var(--primary), 0.5), 0 0 30px hsla(var(--primary), 0.3);
        }
        .bg-custom-outer-orange {
          background: radial-gradient(circle 320px at 0% 0%, hsl(var(--primary) / 0.2) 0%, hsl(var(--background)) 100%);
        }
        .bg-custom-card-orange {
          background: radial-gradient(circle 340px at 0% 0%, hsl(var(--primary) / 0.1) 9%, hsl(var(--background)) 100%);
        }
        .line-topl-orange {
          background: linear-gradient(90deg, hsl(var(--primary)) 30%, hsl(var(--background)) 70%);
        }
        .line-leftl-orange {
          background: linear-gradient(180deg, hsl(var(--primary)) 30%, hsl(var(--background)) 70%);
        }
        .star {
          position: absolute;
          background: hsl(var(--primary));
          border-radius: 9999px;
          box-shadow: 0 0 12px hsl(var(--primary)), 0 0 2px #fff;
          opacity: 0.85;
          z-index: 30;
        }
        .star1-orange { width: 8px; height: 8px; animation: orbit1 6s linear infinite; }
        .star2-orange { width: 6px; height: 6px; animation: orbit2 8s linear infinite; animation-delay: 1.2s; }
        .star3-orange { width: 7px; height: 7px; animation: orbit3 9s linear infinite; animation-delay: 2.5s; opacity: 0.7;}
        .star4-orange { width: 5px; height: 5px; animation: orbit4 7s linear infinite; animation-delay: 3.3s; opacity: 0.85;}
        .star5-orange { width: 4px; height: 4px; animation: orbit5 10s linear infinite; animation-delay: .8s; opacity: 0.9;}
        @keyframes orbit1 {
          0%   { top: 10%; left: 12%; }
          25%  { top: 12%; left: 80%; }
          50%  { top: 75%; left: 70%; }
          75%  { top: 80%; left: 15%; }
          100% { top: 10%; left: 12%; }
        }
        @keyframes orbit2 {
          0%   { top: 18%; left: 82%; }
          20%  { top: 10%; left: 30%; }
          50%  { top: 85%; left: 35%; }
          70%  { top: 60%; left: 75%; }
          100% { top: 18%; left: 82%; }
        }
        @keyframes orbit3 {
          0%   { top: 80%; left: 20%; }
          22%  { top: 35%; left: 60%; }
          48%  { top: 55%; left: 90%; }
          69%  { top: 90%; left: 40%; }
          100% { top: 80%; left: 20%; }
        }
        @keyframes orbit4 {
          0%   { top: 68%; left: 78%; }
          32%  { top: 15%; left: 49%; }
          65%  { top: 75%; left: 17%; }
          100% { top: 68%; left: 78%; }
        }
        @keyframes orbit5 {
          0%   { top: 55%; left: 45%; }
          25%  { top: 25%; left: 90%; }
          50%  { top: 85%; left: 60%; }
          75%  { top: 70%; left: 12%; }
          100% { top: 55%; left: 45%; }
        }
        .grid-bg {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,.7) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,.7) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>
    </div>
  );
}
