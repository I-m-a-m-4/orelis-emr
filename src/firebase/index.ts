// src/firebase/index.ts
'use client';

import { getFirebaseConfig } from './config';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Re-export hooks and providers
export { FirebaseClientProvider } from './client-provider';
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, useUser } from './provider';
export { useCollection, useDoc } from './firestore/use-collection';

type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let firebaseInstances: FirebaseInstances | null = null;

export function initializeFirebase(): Omit<FirebaseInstances, 'firestore'> & { firestore?: Firestore } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const firebaseConfig = getFirebaseConfig();
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);

  return { app, auth };
}
