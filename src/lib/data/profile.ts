'use client';

import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { updateProfile as updateAuthProfile, type Auth } from 'firebase/auth';
import { logAuditEvent } from '@/lib/audit';
import { syncProfileToOffline } from '@/lib/offline/mirror';

/**
 * The signed-in user's own profile.
 *
 * `updateProfileAction` used the Admin SDK for this, which it never needed:
 * `updateProfile` in the client SDK can change the display name of the
 * *currently signed-in* user, and Firestore rules already restrict a user to
 * their own document. Moving it to the client removes a server round-trip and
 * makes a name change work offline like everything else.
 *
 * Changing someone *else's* profile is a different operation and still requires
 * the Admin SDK — that is `/api/admin/staff`.
 */

export async function updateOwnProfile(
  firestore: Firestore,
  // `Auth | null` because `useAuth()` yields null until Firebase initialises, and
  // a name change must not be gated on that: the Firestore write below is what
  // the app renders from, and it works regardless. The Auth display-name update
  // is the only part that needs a live `currentUser`, and it is already optional.
  auth: Auth | null,
  input: { userId: string; name: string; clinicId?: string; role?: string; email?: string }
): Promise<{ success: boolean; message: string }> {
  const name = input.name?.trim() ?? '';
  if (name.length < 2) {
    return { success: false, message: 'Name must be at least 2 characters.' };
  }
  if (!input.userId) {
    return { success: false, message: 'Could not determine which account to update.' };
  }

  try {
    // Firestore is the source of truth the app reads, so it is written first and
    // merged so nothing else on the profile is disturbed.
    void setDoc(
      doc(firestore, 'users', input.userId),
      { name, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch((err) => console.error('Profile Firestore write failed:', err));

    // The Auth display name is what shows in Google sign-in surfaces. Best
    // effort: it needs a live connection, and failing to update it must not
    // block the Firestore change that the app actually renders from.
    const user = auth?.currentUser;
    if (user && user.uid === input.userId) {
      void updateAuthProfile(user, { displayName: name }).catch((err) =>
        console.warn('Auth display name update deferred:', err)
      );
    }

    void syncProfileToOffline({
      id: input.userId,
      uid: input.userId,
      name,
      email: input.email,
      role: input.role,
      clinicId: input.clinicId,
    });

    if (input.clinicId) {
      void logAuditEvent(
        firestore,
        input.clinicId,
        {
          uid: input.userId,
          name,
          email: input.email ?? '',
          role: (input.role as any) ?? 'unknown',
        },
        {
          action: 'settings.update',
          entity: { type: 'user', id: input.userId, name },
          details: { field: 'name' },
        }
      );
    }

    return { success: true, message: 'Profile updated successfully!' };
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { success: false, message: `Failed to update profile: ${err?.message ?? err}` };
  }
}
