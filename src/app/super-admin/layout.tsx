'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { 
  Loader, 
  LogOut, 
  LayoutDashboard, 
  Hospital, 
  Users, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Bug, 
  Newspaper, 
  Sun, 
  Moon, 
  MoreHorizontal,
  Clock,
  Sparkles,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore, FirebaseClientProvider } from '@/firebase';

const ADMIN_EMAILS = ['belloimam431@gmail.com', 'admin@orelis.app'];

const navLinks = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/super-admin#clinics', label: 'Clinics', icon: Hospital, primary: true },
  { href: '/super-admin#users', label: 'Clinicians', icon: Users, primary: true },
  { href: '/super-admin#revenue', label: 'SaaS & Revenue', icon: TrendingUp },
  { href: '/super-admin#ai', label: 'AI & Voice', icon: Zap },
  { href: '/super-admin#security', label: 'Cyber Shield', icon: ShieldCheck },
  { href: '/super-admin#dev-logs', label: 'Dev Logs', icon: Bug, primary: true },
  { href: '/super-admin/blog', label: 'Medical Blog', icon: Newspaper },
  { href: '/super-admin/waitlist', label: 'Waitlist', icon: Clock },
];

const primaryNavLinks = navLinks.filter((link) => link.primary);
const overflowNavLinks = navLinks.filter((link) => !link.primary);

function SuperAdminLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const { setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const [unreadErrorCount, setUnreadErrorCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (isUserLoading) return;

    const isLoginPage = pathname === '/super-admin/login';

    if (!user) {
      if (!isLoginPage) router.replace('/super-admin/login');
      return;
    }

    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || '');

    user.getIdTokenResult(true).then((idTokenResult) => {
      if (idTokenResult.claims.superAdmin || isEmailAdmin) {
        setIsAuthorized(true);
        if (isLoginPage) router.replace('/super-admin');
      } else {
        if (!isLoginPage) router.replace('/dashboard');
      }
    }).catch(() => {
      if (isEmailAdmin) {
        setIsAuthorized(true);
      } else if (!isLoginPage) {
        router.replace('/dashboard');
      }
    });
  }, [user, isUserLoading, router, pathname]);

  // Real-time Error Log telemetry listener
  useEffect(() => {
    if (!firestore || !user || !isAuthorized) return;

    try {
      const q = query(
        collection(firestore, 'error_logs'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (typeof window === 'undefined') return;
        const lastViewedTimeStr = localStorage.getItem('orelis_last_viewed_errors');
        const lastViewedTime = lastViewedTimeStr ? parseInt(lastViewedTimeStr) : 0;

        let count = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt) {
            const date = typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate()
              : new Date(data.createdAt);
            const time = date.getTime();
            if (!isNaN(time) && time > lastViewedTime) {
              count++;
            }
          }
        });
        setUnreadErrorCount(count);
      }, () => {
        // Silently catch listener errors
      });

      return () => unsubscribe();
    } catch {
      // Ignore if collection not ready
    }
  }, [firestore, user, isAuthorized]);

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      router.push('/super-admin/login');
    }).catch((err) => console.error('Sign out error:', err));
  };

  const isLinkActive = (href: string) => {
    if (href === '/super-admin') return pathname === '/super-admin';
    return pathname.startsWith(href);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Verifying Super Admin clearance...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/super-admin/login') {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  if (user && isAuthorized) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground relative">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/super-admin"
              className="flex items-center gap-2 text-base font-black tracking-tight whitespace-nowrap mr-2"
            >
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
                Ω
              </div>
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-primary bg-clip-text text-transparent font-bold">
                Orelis Super Admin
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium overflow-x-auto scrollbar-none py-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap px-2 py-1 transition-colors hover:text-foreground text-xs font-semibold rounded-md',
                    isLinkActive(link.href)
                      ? 'text-primary bg-primary/10 font-bold'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                  {link.label === 'Dev Logs' && unreadErrorCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-4 px-1 py-0 flex items-center justify-center text-[9px] font-black rounded-full animate-pulse bg-red-600 text-white border-0"
                    >
                      {unreadErrorCount}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="rounded-full w-9 h-9 border-muted hover:bg-accent shrink-0"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="shrink-0 hidden md:flex text-xs h-9 border-border"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Logout
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden w-9 h-9"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-md h-16">
          <div className="flex justify-around items-center h-full px-2">
            {primaryNavLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center justify-center flex-1 h-full"
                >
                  <div className="relative mb-0.5">
                    <link.icon
                      className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                    {link.label === 'Dev Logs' && unreadErrorCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] text-white font-bold">
                        {unreadErrorCount > 9 ? '9+' : unreadErrorCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] leading-none font-medium',
                      active ? 'text-primary font-bold' : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}

            <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex flex-col items-center justify-center flex-1 h-full"
                  aria-label="More sections"
                >
                  <div className="relative mb-0.5">
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] leading-none font-medium text-muted-foreground">
                    More
                  </span>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="rounded-t-2xl pb-6">
                <SheetHeader className="text-left mb-3">
                  <SheetTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Orelis Super Admin Sections
                  </SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-3">
                  {overflowNavLinks.map((link) => {
                    const active = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border p-3.5 transition-colors',
                          active ? 'border-primary bg-primary/10 text-primary font-bold' : 'hover:bg-accent text-muted-foreground'
                        )}
                      >
                        <link.icon className="h-5 w-5" />
                        <span className="text-center text-[11px] leading-tight font-medium">
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader className="size-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Authenticating clearance...</p>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
    </FirebaseClientProvider>
  );
}
