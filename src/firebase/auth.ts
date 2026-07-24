
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
  type UserCredential,
  type User,
  type AuthError
} from 'firebase/auth';
import { initializeFirebase } from './index';

export type SignInResult = {
  user: User | null;
  error: AuthError | null;
};

export async function signInWithGoogle(): Promise<SignInResult> {
  const { auth } = initializeFirebase();
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

export async function signOut() {
  const { auth } = initializeFirebase();
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    // You might want to return the error to be handled in the UI
    return error as AuthError;
  }
}


export async function createUserWithEmail(email:string, password:string):Promise<SignInResult> {
  const { auth } = initializeFirebase();
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
  const { auth } = initializeFirebase();
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
  const { auth } = initializeFirebase();
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}
