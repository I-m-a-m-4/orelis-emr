
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  Search,
  LayoutDashboard,
  Users,
  Calendar,
  UserPlus,
  FileText,
  LifeBuoy,
  Settings,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Patient, NavItem } from '@/lib/types';
import { DialogDescription, DialogTitle } from '../ui/dialog';

const allNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
    { href: '/dashboard/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'receptionist'] },
    { href: '/dashboard/staff', label: 'Staff', icon: UserPlus, roles: ['admin'] },
    { href: '/dashboard/my-records', label: 'My Records', icon: FileText, roles: ['patient'] },
    { href: '/dashboard/support', label: 'Support', icon: LifeBuoy, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin', 'doctor', 'receptionist', 'patient'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const patientsQuery = useMemo(() => {
    if (!firestore || !userProfile?.clinicId || userProfile.role === 'patient') return null;
    return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
  }, [firestore, userProfile]);
  const { data: patients } = useCollection<Patient>(patientsQuery);

  const availableNavItems = useMemo(() => {
    if (!userProfile) return [];
    return allNavItems.filter(item => item.roles.includes(userProfile.role));
  }, [userProfile]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => unknown) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <span className="hidden lg:inline-block pl-6">Search...</span>
        <span className="inline-block lg:hidden pl-6">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">Search for pages and patients.</DialogDescription>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {availableNavItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`Go to ${item.label}`}
                onSelect={() => runCommand(() => router.push(item.href))}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {userProfile?.role !== 'patient' && patients && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Patients">
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.firstName} ${patient.surname} ${patient.patientCode}`}
                    onSelect={() => runCommand(() => router.push(`/dashboard/patients/${patient.id}`))}
                    className="cursor-pointer"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{patient.firstName} {patient.surname}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
