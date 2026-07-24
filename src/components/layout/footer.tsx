
import {
    Twitter,
    Github,
    Linkedin,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { OrelisLogo } from './orelis-logo';


export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative mt-6 overflow-hidden border border-dashed border-border p-8 sm:p-12 noisy-bg">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(249,115,22,0.25),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(249,115,22,0.2),transparent)] opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] card-glow"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.45] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
                    </div>
                    <div className="relative">
                        <div className="grid grid-cols-1 gap-12 border-b border-border pb-12 md:grid-cols-2 lg:grid-cols-5">
                            <div className="lg:col-span-2">
                                <div className="flex flex-col items-start">
                                    <div className="inline-flex items-center justify-center">
                                        <OrelisLogo />
                                    </div>
                                    <p className="mt-4 mb-6 text-left text-sm leading-relaxed text-muted-foreground">
                                        The future of healthcare management. Streamlined,
                                        secure, and intelligent.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href="#"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted ring-1 ring-border text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                                        >
                                            <Twitter fill="currentColor" size={18} />
                                        </a>
                                        <a
                                            href="#"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted ring-1 ring-border text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                                        >
                                            <Github fill="currentColor" size={18} />
                                        </a>
                                        <a
                                            href="#"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted ring-1 ring-border text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                                        >
                                            <Linkedin fill="currentColor" size={18} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left">
                                <h4 className="mb-4 text-sm font-semibold tracking-tight text-foreground font-headline">
                                    Product
                                </h4>
                                <ul className="space-y-3">
                                    <li>
                                        <Link
                                            href="/features"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Features
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/pricing"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Pricing
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/pitch"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Pitch Deck
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/patient-portal"
                                            className="text-sm font-bold text-primary transition hover:text-foreground"
                                        >
                                            Patient Portal
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="#"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Changelog
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-left">
                                <h4 className="mb-4 text-sm font-semibold tracking-tight text-foreground font-headline">
                                    Resources
                                </h4>
                                <ul className="space-y-3">
                                    <li>
                                        <Link
                                            href="/dashboard/developers"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            API & Developers
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/dashboard/support"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Technical Documentation
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="#"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Support Center
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="#"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Community
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-left">
                                <h4 className="mb-4 text-sm font-semibold tracking-tight text-foreground font-headline">
                                    Company
                                </h4>
                                <ul className="space-y-3">
                                    <li>
                                        <Link
                                            href="/about"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            About
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/blog"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Blog
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="#"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Careers
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/contact"
                                            className="text-sm text-muted-foreground transition hover:text-foreground"
                                        >
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-between gap-4 pt-8 md:flex-row">
                            <p className="text-sm text-muted-foreground/80">
                                © {currentYear} Orelis. All rights reserved.
                            </p>
                            <div className="flex items-center gap-6">
                                <Link
                                    href="/privacy"
                                    className="text-sm text-muted-foreground/80 transition hover:text-foreground"
                                >
                                    Privacy Policy
                                </Link>
                                <Link
                                    href="/terms"
                                    className="text-sm text-muted-foreground/80 transition hover:text-foreground"
                                >
                                    Terms of Service
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
