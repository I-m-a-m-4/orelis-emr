// src/firebase/client-provider.tsx
'use client';
import { initializeFirebase } from './index';
import { FirebaseProvider, useUser, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { LoadingAnimation } from '@/components/layout/loading-animation';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, getFirestore } from 'firebase/firestore';

type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseInstances, setFirebaseInstances] = useState<FirebaseInstances | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupFirebase = async () => {
      try {
        const instances = initializeFirebase();
        if (instances) {
          let firestore: Firestore;
          try {
            // Attempt to initialize Firestore with persistence
            firestore = initializeFirestore(instances.app, {
              localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) })
            });
          } catch (e: any) {
            // If already initialized or other error, fallback to getFirestore
            console.warn("Firestore custom initialization failed, falling back:", e.message);
            firestore = getFirestore(instances.app);
          }

          setFirebaseInstances({
            app: instances.app,
            auth: instances.auth,
            firestore
          });
        }
      } catch (e: any) {
        console.error("Firebase overall initialization error:", e);
        setError("Could not initialize Firebase. Please check your connection.");
      }
    };

    setupFirebase();
  }, []); // Empty dependency array ensures this runs only once.

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!firebaseInstances) {
    // While Firebase is initializing, show a loading state instead of rendering children.
    // This prevents children from trying to access a null Firebase context.
    return <LoadingAnimation />;
  }

  const { app, auth, firestore } = firebaseInstances;

  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}

// Re-export hooks for convenience
export { useUser, useFirebase, useFirebaseApp, useAuth, useFirestore };
