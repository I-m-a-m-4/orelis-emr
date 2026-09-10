'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  initNativeNotificationPermissions,
  setNativeNotificationRouter,
  triggerNativeNotification,
} from '@/lib/native-notifications';

function safeToDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function NativeNotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const initializedRef = React.useRef(false);

  // Connect Next.js router to the native notification dispatcher
  React.useEffect(() => {
    setNativeNotificationRouter((path: string) => router.push(path));
  }, [router]);

  // Request native OS notification permission on load
  React.useEffect(() => {
    if (user?.uid) {
      void initNativeNotificationPermissions();
    }
  }, [user?.uid]);

  // Real-time Firestore bridge for user notifications
  React.useEffect(() => {
    if (!user?.uid || !db) return;

    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, orderBy('timestamp', 'desc'), limit(5));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Skip historical notifications on initial snapshot load
        if (!initializedRef.current) {
          initializedRef.current = true;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;

          const data = change.doc.data() as any;
          if (!data?.title) return;

          // Freshness check: ignore if older than 10 minutes
          const timeVal = data.timestamp || data.createdAt;
          const createdAt = timeVal ? safeToDate(timeVal).getTime() : Date.now();
          if (Date.now() - createdAt > 10 * 60 * 1000) return;

          // Trigger native OS notification
          void triggerNativeNotification({
            key: change.doc.id,
            title: data.title,
            body: data.message || data.body || '',
            url: data.link || data.url || '/dashboard/notifications',
          });
        });
      },
      (err) => {
        console.debug('[notifications] Realtime listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, db]);

  return null;
}
