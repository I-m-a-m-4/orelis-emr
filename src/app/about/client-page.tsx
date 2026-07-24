
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';

export function AboutClientPage() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '50px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    // Animate hero on load
    document.getElementById('heroImage')?.classList.add('loaded');
    document.getElementById('heroOverlay')?.classList.add('loaded');
    document.querySelectorAll('.animate-load-in').forEach(el => {
        el.classList.add('loaded');
    });

  }, []);

  return (
    <div className="bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      
      <PublicHeader />
      
      <section className="relative min-h-screen w-full flex items-center justify-center">
        <Image 
            id="heroImage" 
            src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=1932&auto=format&fit=crop" 
            alt="Healthcare professionals collaborating" 
            fill
            className="absolute inset-0 w-full h-full object-cover object-center z-0 opacity-0 scale-125 blur-md transition-all duration-[2000ms] ease-out"
            style={{ filter: 'brightness(0.56)' }}
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
        />
        <div id="heroOverlay" className="absolute inset-0 bg-gradient-to-bl from-background/80 via-background/60 to-background/90 z-10 opacity-0 transition-opacity duration-[1500ms] ease-out"></div>
        
        <div className="container relative z-20 flex flex-col min-h-screen mr-auto ml-auto pr-6 pl-6 pt-[20vh] pb-[30vh]">
          <div className="flex flex-col w-full h-full justify-center text-left">
            <div className="animate-load-in opacity-0" style={{ transitionDelay: '1000ms' }}>
              <span className="inline-flex items-center gap-2 px-4 py-1 bg-muted ring-1 ring-inset ring-border rounded-full text-sm mb-6 backdrop-blur-md font-medium w-fit text-muted-foreground">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Revolutionizing Healthcare
              </span>
            </div>
            
            <div className="animate-load-in opacity-0" style={{ transitionDelay: '1200ms' }}>
              <h1 className="text-4xl md:text-6xl font-headline font-semibold leading-tight tracking-tight mb-6 text-foreground">
                The People Behind<br/>the Future of<br/>Patient Care
              </h1>
            </div>
            
            <div className="animate-load-in opacity-0" style={{ transitionDelay: '1400ms' }}>
              <p className="max-w-2xl text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                We are Orelis — a dedicated team of innovators, developers, and healthcare professionals blending empathy, design, and technology to create powerful, accessible tools that empower clinics and improve lives.
              </p>
            </div>
            
            <div className="animate-load-in opacity-0" style={{ transitionDelay: '1600ms' }}>
              <Link href="#about" className="inline-flex items-center gap-4 bg-primary hover:bg-primary/90 transition text-primary-foreground font-medium rounded-full pl-2 pr-6 py-2 shadow-lg w-fit">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right w-5 h-5"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </span>
                Learn More
              </Link>
            </div>
          </div>
        </div>

        <div id="heroText" className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none select-none overflow-hidden animate-load-in opacity-0" style={{ transitionDelay: '1800ms' }}>
          <h2 className="tracking-tight text-center font-space-grotesk text-[24vw] leading-none text-muted/10 font-bold uppercase whitespace-nowrap w-full">
            Orelis
          </h2>
        </div>
      </section>

      <section id="about" className="relative noisy-bg border-border border-t pt-32 pb-32">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
              <div className="animate-on-scroll">
                <div className="relative">
                  <div className="relative overflow-hidden rounded-2xl h-96 md:h-[500px] ring-1 ring-border">
                    <Image src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1770&auto=format&fit=crop" alt="Orelis Team working" fill className="absolute inset-0 w-full h-full object-cover object-center"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent"></div>
                  </div>
                  
                  <div className="absolute -bottom-6 -right-6 bg-card/90 backdrop-blur-lg ring-1 ring-border rounded-xl p-4 shadow-2xl">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-foreground mb-1">10k+</div>
                      <div className="text-xs text-muted-foreground">Patients Served</div>
                    </div>
                  </div>
                  
                  <div className="absolute -top-6 -left-6 bg-card/90 backdrop-blur-lg ring-1 ring-border rounded-xl p-4 shadow-2xl">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-foreground mb-1">200+</div>
                      <div className="text-xs text-muted-foreground">Clinics Onboarded</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="animate-on-scroll lg:pl-8">
                <span className="inline-flex items-center gap-2 px-4 py-1 bg-muted ring-1 ring-inset ring-border rounded-full text-sm mb-6 font-medium text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Our Mission
                </span>
                
                <h2 className="text-4xl md:text-5xl font-headline font-semibold tracking-tight mb-8 text-foreground">
                  Engineering a Healthier Tomorrow
                </h2>
                
                <div className="space-y-6 text-muted-foreground leading-relaxed mb-10">
                  <p className="text-lg">
                    With a deep-rooted passion for both healthcare and technology, we specialize in creating intuitive digital ecosystems that bridge the gap between patient needs and clinical efficiency.
                  </p>
                  
                  <p className="">
                    Our journey began with a simple question: How can we make clinic management seamless? We believe great software is invisible — it should feel natural and empower healthcare professionals to focus on what matters most: their patients.
                  </p>
                  
                  <p>
                    We are particularly passionate about data security and system reliability, ensuring that every digital interaction is safe, fast, and builds trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
