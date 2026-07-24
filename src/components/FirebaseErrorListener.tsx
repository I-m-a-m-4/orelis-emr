// src/components/FirebaseErrorListener.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';
import { ShieldAlert, Wifi, WifiOff } from 'lucide-react';

export function FirebaseErrorListener() {
  const { toast, dismiss } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const offlineToastId = useRef<string | null>(null);


  useEffect(() => {
    // Set initial state from navigator
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleError = (error: FirestorePermissionError) => {
      console.error('Firestore Permission Error:', error.message, error.context);
      
      toast({
        title: (
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            <span>Access Denied</span>
          </div>
        ),
        description: "An operation was blocked due to insufficient permissions.",
        variant: "destructive",
        duration: 10000,
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    if (!isOnline) {
      // If we are offline and there's no toast yet, show one.
      if (!offlineToastId.current) {
        const { id } = toast({
          title: (
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              <span>You are offline</span>
            </div>
          ),
          description: "Your changes are being saved locally and will sync when you're back online.",
          variant: "default",
          duration: Infinity, 
        });
        offlineToastId.current = id;
      }
    } else {
      // If we are back online, dismiss the offline toast if it exists.
      if (offlineToastId.current) {
        dismiss(offlineToastId.current);
        offlineToastId.current = null;
        // Show a temporary "back online" message.
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-orange-500" />
              <span>You're back online</span>
            </div>
          ),
          description: "Your changes have been successfully synced.",
          duration: 5000,
        });
      }
    }
  }, [isOnline, toast, dismiss]);


  return null; 
}
