
'use client';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/footer';
import { ContactForm } from '@/components/contact-form';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layout/public-header';

export function ContactClientPage() {
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
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
  }, []);

  const contactOptions = [
      { id: 'form', label: 'General Inquiry', icon: Mail },
      { id: 'sales', label: 'Sales & Demos', icon: Phone },
      { id: 'support', label: 'Support', icon: Phone },
      { id: 'location', label: 'Our Office', icon: MapPin },
  ];

  return (
    <div className="bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      
      <PublicHeader />

      <section className="relative min-h-screen grid noisy-bg place-content-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12 mx-auto max-w-7xl px-4 py-24 sm:py-32 lg:px-8">
            <div className="relative col-span-full flex flex-col lg:col-span-5">
                <div className="flex flex-col gap-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1 bg-muted ring-1 ring-inset ring-border rounded-full text-sm font-medium text-muted-foreground w-fit">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Contact Us
                    </div>
                    <h1 className="text-4xl md:text-5xl font-headline font-semibold tracking-tight text-foreground text-balance">
                        Let's build the future of healthcare, together.
                    </h1>
                    <p className="text-lg text-muted-foreground text-balance">
                        Whether you're interested in a demo, have a question about pricing, or want to explore a partnership, we're here to talk.
                    </p>
                </div>
                <div className="mt-auto pt-12">
                    <ul className="flex flex-col gap-1.5">
                        {contactOptions.map(option => (
                            <li key={option.id}>
                                <button
                                    onClick={() => setActiveTab(option.id)}
                                    className={`w-full text-left p-3 rounded-md transition-colors duration-200 text-muted-foreground hover:bg-muted ${activeTab === option.id ? '!text-primary' : ''}`}>
                                <span className="font-mono text-sm uppercase flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full transition-colors ${activeTab === option.id ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                    {option.label}
                                </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="relative flex items-center justify-center pt-16 lg:col-span-7 lg:pt-0">
                <div className="relative w-full max-w-2xl">
                    {contactOptions.map(option => (
                        <div key={option.id} className={`transition-all duration-500 ease-in-out ${activeTab === option.id ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
                            {option.id === 'form' && (
                                <div className="bg-card/50 p-8 border border-border backdrop-blur-sm">
                                    <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Send us a Message</h2>
                                    <ContactForm />
                                </div>
                            )}
                            {option.id === 'sales' && (
                                <div className="bg-card/50 p-8 rounded-2xl border border-dashed border-border backdrop-blur-sm">
                                <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-semibold text-foreground font-headline">Sales & Demos</h3>
                                            <p className="text-muted-foreground mt-2">Interested in seeing Orelis in action? Let's talk.</p>
                                            <p className="text-lg text-foreground mt-4 font-medium"><a href="mailto:sales@orelis.com" className="hover:text-primary transition-colors">sales@orelis.com</a></p>
                                            <Button asChild className="mt-6">
                                                <Link href="#">Schedule a Demo <ArrowRight /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {option.id === 'support' && (
                                <div className="bg-card/50 p-8 rounded-2xl border border-dashed border-border backdrop-blur-sm">
                                <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-semibold text-foreground font-headline">Technical Support</h3>
                                            <p className="text-muted-foreground mt-2">Need help with your account? Our team is here for you.</p>
                                            <p className="text-lg text-foreground mt-4 font-medium"><a href="mailto:support@orelis.com" className="hover:text-primary transition-colors">support@orelis.com</a></p>
                                            <Button asChild className="mt-6" variant="secondary">
                                                <Link href="#">Visit Help Center <ArrowRight /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {option.id === 'location' && (
                                <div className="bg-card/50 p-8 rounded-2xl border border-dashed border-border backdrop-blur-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                        <MapPin className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                        <h3 className="text-2xl font-semibold text-foreground font-headline">Our Office</h3>
                                        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">123 Health Tech Ave, Suite 100<br/>San Francisco, CA 94107</p>
                                        <p className="text-muted-foreground mt-2 text-sm">Visits are by appointment only.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          </div>
      </section>

      <Footer />
    </div>
  );
}
