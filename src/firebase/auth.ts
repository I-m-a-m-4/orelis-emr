
// src/firebase/auth.ts
'use client';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type Auth,
  type UserCredential,
  type User,
  type AuthError
} from 'firebase/auth';
import { initializeFirebase } from './index';

export type SignInResult = {
  user: User | null;
  error: AuthError | null;
};

/**
 * The client `Auth` instance, or null on the server.
 *
 * `initializeFirebase()` returns null when there is no `window`, which the static
 * export needs — a prerender must not open a Firebase connection. Every function
 * below is user-initiated and so only ever runs in a browser, but
 * `const { auth } = initializeFirebase()` would throw `TypeError: Cannot
 * destructure property 'auth' of 'null'` if that assumption ever broke, and a
 * raw TypeError surfaces as a blank screen rather than as a failed sign-in.
 */
function clientAuth(): Auth | null {
  return initializeFirebase()?.auth ?? null;
}

/**
 * An `AuthError`-shaped value for "Firebase is not available".
 *
 * Uses the real `auth/internal-error` code rather than an invented one, so any
 * caller that switches on `error.code` lands on a branch it already knows how to
 * render instead of falling through with no message.
 */
function authUnavailable(): AuthError {
  return {
    name: 'FirebaseError',
    code: 'auth/internal-error',
    message: 'Authentication is not available. Please reload and try again.',
  } as AuthError;
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const auth = clientAuth();
  if (!auth) return { user: null, error: authUnavailable() };

  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

export async function signOut() {
  const auth = clientAuth();
  if (!auth) return authUnavailable();

  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    // You might want to return the error to be handled in the UI
    return error as AuthError;
  }
}


export async function createUserWithEmail(email:string, password:string):Promise<SignInResult> {
  const auth = clientAuth();
  if (!auth) return { user: null, error: authUnavailable() };

  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

export async function signInWithEmail(email:string, password:string):Promise<SignInResult> {
  const auth = clientAuth();
  if (!auth) return { user: null, error: authUnavailable() };

   try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

export async function sendPasswordReset(email: string): Promise<{ error: AuthError | null }> {
  const auth = clientAuth();
  if (!auth) return { error: authUnavailable() };

  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}
