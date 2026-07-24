'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import type { UserProfile } from '@/lib/types';
import { allNavItems, roleHierarchy } from '@/components/layout/app-sidebar';
import { cn } from '@/lib/utils';

interface MobileNavProps {
    userProfile: UserProfile | null;
    isLoading: boolean;
}

export function MobileNav({ userProfile, isLoading }: MobileNavProps) {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();

    if (isLoading || !userProfile) return null;

    const isSuperAdminRoute = pathname.startsWith('/super-admin');

    // Same logic as sidebar
    const getNavItems = () => {
        if (isSuperAdminRoute) {
            return allNavItems.filter(item => item.superAdmin);
        }

        const userRoles = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || [userProfile.role];
        return allNavItems.filter(item =>
            !item.superAdmin && item.roles.some(role => userRoles.includes(role))
        );
    };

    const navItems = getNavItems();

    // We want max 4 actual routes on the bottom bar, plus a 5th "More" button if needed.
    // Actually, standard is up to 5 items on a bottom nav.
    const MAX_ITEMS = 4;
    const visibleItems = navItems.slice(0, MAX_ITEMS);
    const hasMore = navItems.length > MAX_ITEMS;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.8)]">
            <nav className="flex items-center justify-around w-full h-16">
                {visibleItems.map((item) => {
                    const isActive = pathname.startsWith(item.href) &&
                        (item.href !== '/dashboard' && item.href !== '/super-admin' || pathname === item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-primary/70"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                            <span className="text-[10px] truncate w-full text-center px-1">{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    onClick={() => setOpenMobile(true)}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 text-muted-foreground hover:text-primary active:scale-95 touch-manipulation group"
                >
                    <div className="p-1 rounded-lg group-hover:bg-primary/10 transition-colors">
                        <Menu className="w-5 h-5 group-hover:text-primary" />
                    </div>
                    <span className="text-[10px] font-medium tracking-tight">More</span>
                </button>
            </nav>
        </div>
    );
}
