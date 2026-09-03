
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, LayoutDashboard, Users, Calendar, Settings, UserPlus, LifeBuoy, Shield, FileText, Newspaper, Bell, Hospital, Mailbox, Package, BadgeDollarSign, BarChart3, ExternalLink, Pill, FlaskConical, Bed, CreditCard, ClipboardList, Code } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import type { NavItem, UserProfile } from '@/lib/types';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navGroups: { label: string, items: NavItem[] }[] = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
      { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
      { href: '/dashboard/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'receptionist'] },
      { href: '/dashboard/my-records', label: 'My Records', icon: FileText, roles: ['patient', 'admin', 'doctor'] },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
    ]
  },
  {
    label: 'Clinical',
    items: [
      { href: '/dashboard/encounters', label: 'Consultations', icon: ClipboardList, roles: ['admin', 'doctor'] },
      { href: '/dashboard/records', label: 'Clinical Archive', icon: Stethoscope, roles: ['admin', 'doctor'] },
      { href: '/dashboard/lab', label: 'Laboratory', icon: FlaskConical, roles: ['admin', 'doctor'] },
      { href: '/dashboard/pharmacy', label: 'Pharmacy', icon: Pill, roles: ['admin', 'doctor'] },
      { href: '/dashboard/wards', label: 'Ward Management', icon: Bed, roles: ['admin', 'doctor'] },
      { href: '/dashboard/telehealth', label: 'Telehealth', icon: ExternalLink, roles: ['admin', 'doctor'] },
    ]
  },
  {
    label: 'Management',
    items: [
      { href: '/dashboard/reports', label: 'Analytics & Reports', icon: BarChart3, roles: ['admin', 'doctor'] },
      { href: '/dashboard/billing', label: 'Billing Center', icon: CreditCard, roles: ['admin'] },
      { href: '/dashboard/inventory', label: 'Inventory & Stock', icon: Package, roles: ['admin', 'doctor'] },
      { href: '/dashboard/waitlist', label: 'Waitlist', icon: Mailbox, roles: ['admin', 'receptionist'] },
      { href: '/dashboard/hospital', label: 'Hospital Facility', icon: Hospital, roles: ['admin'] },
      { href: '/dashboard/developers', label: 'Developer APIs', icon: Code, roles: ['admin'] },
    ]
  }
];

export const allNavItems = navGroups.flatMap(group => group.items);

interface AppSidebarProps {
  userProfile: UserProfile | null;
  isLoading: boolean;
}

export const roleHierarchy = {
  admin: ['admin', 'doctor', 'receptionist'],
  doctor: ['doctor', 'receptionist'],
  receptionist: ['receptionist'],
  patient: ['patient'],
};

export function AppSidebar({ userProfile, isLoading }: AppSidebarProps) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const forceExpanded = !!isMobile || state === 'expanded';

  const isSuperAdminRoute = pathname.startsWith('/super-admin');

  const getFilteredGroups = () => {
    if (isLoading || !userProfile) return [];

    const userRoles = roleHierarchy[userProfile.role] || [userProfile.role];

    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.roles.some(role => userRoles.includes(role))
      )
    })).filter(group => group.items.length > 0);
  }

  const superAdminItems = [
    { href: '/super-admin', label: 'Overview', icon: Shield },
    { href: '/super-admin/blog', label: 'Blog Content', icon: Newspaper },
  ];

  const filteredGroups = getFilteredGroups();
  const isAdminOrDoctor = userProfile?.role === 'admin' || userProfile?.role === 'doctor';

  return (
    <>
      <SidebarHeader className={cn("p-2", !forceExpanded ? "items-center" : "")}>
        <Link href="/dashboard" className="flex items-center gap-2">
          {forceExpanded ? <OrelisLogo /> : <Stethoscope className="h-8 w-8 text-primary" />}
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2 gap-6 mt-4">
        {isAdminOrDoctor && forceExpanded && (
          <div className="px-2 mb-4">
            <Button asChild className="w-full justify-start gap-2 h-12 button-glow shadow-xl shadow-primary/30 border-2 border-primary/20 bg-primary hover:bg-primary/90 text-white" size="sm">
              <Link href="/dashboard/encounters/new">
                <div className="p-1 bg-white/20 rounded">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-black text-xs uppercase tracking-tighter">New Consultation</span>
                  <span className="text-[9px] opacity-80 font-medium">Record SOAP Note</span>
                </div>
              </Link>
            </Button>
          </div>
        )}
        {isLoading ? (
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </SidebarMenu>
        ) : isSuperAdminRoute ? (
          <SidebarMenu>
            {superAdminItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className={cn(
                    "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground h-10 transition-all duration-200",
                    !forceExpanded ? "w-10 justify-center" : "w-full px-3"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("shrink-0", !forceExpanded ? "h-5 w-5" : "h-4 w-4")} />
                    {forceExpanded && <span className="ml-2 truncate">{item.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {forceExpanded && (
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </div>
              )}
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === item.href)}
                      tooltip={item.label}
                      className={cn(
                        "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground h-10 transition-all duration-200",
                        !forceExpanded ? "w-10 justify-center" : "w-full px-3"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("shrink-0", !forceExpanded ? "h-5 w-5" : "h-4 w-4")} />
                        {forceExpanded && <span className="ml-2 truncate">{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))
        )}
      </SidebarContent>
      {!isSuperAdminRoute && (
        <SidebarFooter className="p-2 gap-1 border-t border-dashed">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/dashboard/support')}
                tooltip="Support Center"
                className={cn(
                  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground h-10 transition-all duration-200",
                  !forceExpanded ? "w-10 justify-center" : "w-full px-3"
                )}
              >
                <Link href="/dashboard/support">
                  <LifeBuoy className={cn("shrink-0", !forceExpanded ? "h-5 w-5" : "h-4 w-4")} />
                  {forceExpanded && <span className="ml-2 truncate">Support Center</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {userProfile?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/dashboard/staff')}
                  tooltip="Team & Staff"
                  className={cn(
                    "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground h-10 transition-all duration-200",
                    !forceExpanded ? "w-10 justify-center" : "w-full px-3"
                  )}
                >
                  <Link href="/dashboard/staff">
                    <UserPlus className={cn("shrink-0", !forceExpanded ? "h-5 w-5" : "h-4 w-4")} />
                    {forceExpanded && <span className="ml-2 truncate">Team & Staff</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings')}
                tooltip="General Settings"
                className={cn(
                  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground h-10 transition-all duration-200",
                  !forceExpanded ? "w-10 justify-center" : "w-full px-3"
                )}
              >
                <Link href="/dashboard/settings">
                  <Settings className={cn("shrink-0", !forceExpanded ? "h-5 w-5" : "h-4 w-4")} />
                  {forceExpanded && <span className="ml-2 truncate">General Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </>
  );
}
