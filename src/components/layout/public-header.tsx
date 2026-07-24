
// src/components/layout/public-header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LayoutDashboard } from 'lucide-react';
import { signOut } from '@/firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';


const AnimatedHamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="w-6 h-6 flex flex-col justify-around">
    <div
      className={`bg-foreground h-0.5 w-full transform transition-transform duration-300 ${open ? 'rotate-45 translate-y-[5px]' : ''
        }`}
    />
    <div
      className={`bg-foreground h-0.5 w-full transform transition-transform duration-300 ${open ? '-rotate-45 -translate-y-[5px]' : ''
        }`}
    />
  </div>
);

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/patient-portal", label: "Patient Portal" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" }
  ];

  return (
    <header className="fixed top-0 z-50 w-full bg-background/60 backdrop-blur-lg border-b border-dashed border-border transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="inline-flex items-center justify-center">
            <OrelisLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`transition hover:text-foreground hover:underline ${pathname === link.href ? 'nav-link-active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            {loading ? (
              <div className="h-9 w-24 rounded-full bg-muted/50 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      {user.photoURL ? (
                        <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                      ) : (
                        <AvatarFallback>{getInitials(user.displayName || '?')}</AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
                  Login
                </Link>
                <Button asChild className="contact-button">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <button
            id="mobileMenuBtn"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted ring-1 ring-border md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <AnimatedHamburgerIcon open={mobileMenuOpen} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobileMenu" className="flex flex-col gap-4 py-6 md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-in slide-in-from-top duration-300">
            <div className="flex justify-end px-4">
              <ThemeToggle />
            </div>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-muted-foreground transition hover:text-foreground px-2 py-1 rounded-md hover:bg-muted ${pathname === link.href ? 'text-foreground bg-muted font-medium' : ''}`}>
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
              {loading ? (
                <div className="h-9 w-full rounded-md bg-muted/50 animate-pulse mt-2" />
              ) : user ? (
                <Button asChild variant="secondary" className="w-full justify-center">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Link href="/login" className="contact-button w-full text-center">
                    Login
                  </Link>
                  <Button asChild className="contact-button w-full justify-center mt-2">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
