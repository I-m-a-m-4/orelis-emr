
"use client";

import Link from 'next/link';
import { Search, Bell, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '../ui/sidebar';
import { useUser, useCollection, useFirestore, useDoc } from '@/firebase';
import { signOut } from '@/firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Notification, UserProfile } from '@/lib/types';
import { collection, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { CommandPalette } from './command-palette';


function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsQuery = useMemo(() => {
    // IMPORTANT: Do not create the query until both user and firestore are available.
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [user, firestore]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.read).length || 0;
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user || !firestore || !notification.id) return;

    if (!notification.read) {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
      await updateDoc(notifRef, { read: true });
    }

    if (notification.link) {
      router.push(notification.link);
    } else {
      router.push('/dashboard/notifications');
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative cursor-pointer">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-orange-500 text-white">{unreadCount}</Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications && notifications.length > 0 ? (
          notifications.map(notif => (
            <DropdownMenuItem key={notif.id} onSelect={(e) => e.preventDefault()} className="p-0">
              <div
                onClick={() => handleNotificationClick(notif)}
                className={`w-full cursor-pointer flex items-start gap-2 p-2 ${!notif.read ? 'bg-accent' : ''}`}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notifications" className="cursor-pointer justify-center">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function AppHeader() {
  const { user, loading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-auto items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 py-2">
      <SidebarTrigger className="hidden md:flex" />

      <CommandPalette />

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full cursor-pointer"
            >
              <Avatar className="h-9 w-9">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                <AvatarFallback>{user?.displayName ? getInitials(user.displayName) : <User />}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer"><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer"><Link href="/dashboard/support">Support</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
