
'use server';

import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { revalidatePath } from 'next/cache';

/**
 * Server Actions — **web build only**.
 *
 * Everything left in this file is reachable exclusively from the marketing site
 * and the super-admin console, neither of which ships in the packaged desktop and
 * mobile apps. That is deliberate: Server Actions cannot exist in a Next.js static
 * export, which is what Tauri bundles, so `scripts/tauri-prebuild.mjs` renames
 * this file (and the pages that import it) out of the way for a native build.
 *
 * **Do not add anything the dashboard needs here.** The clinical write path moved
 * to two places, for two different reasons:
 *
 * - `src/lib/data/*` — client-side Firestore writes for anything a clinician does.
 *   These work with no connection, which is the entire point.
 * - `src/app/api/admin/*` and `src/app/api/ai/*` — operations that genuinely need
 *   `firebase-admin` or a Gemini key, called through `src/lib/api-client.ts`.
 *
 * Adding a dashboard action back here would compile fine on the web and break the
 * native build at bundle time, with an error that points at the export rather than
 * at the import that caused it.
 */

// --- Contact Form (marketing site) ---
const contactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    message: z.string().min(10, "Message must be at least 10 characters."),
});

export type ContactFormState = {
    message: string;
    errors?: {
        name?: string[];
        email?: string[];
        message?: string[];
    };
    isSuccess: boolean;
};

export async function submitContactForm(
    prevState: ContactFormState,
    formData: FormData
): Promise<ContactFormState> {
    const validatedFields = contactFormSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Please correct the errors below.',
            isSuccess: false,
        };
    }

    console.log('Contact Form Submitted:', validatedFields.data);

    return { message: "Thank you for your message! We'll get back to you soon.", isSuccess: true };
}

// --- Super Admin: Set Super Admin Claim ---
export async function setSuperAdminClaim(userId: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
        // Server-side check for the specific email
        if (email !== 'bimex4@gmail.com') {
            return { success: false, message: 'Not authorized to become a super admin.' };
        }

        const adminApp = await initializeAdminApp();
        const auth = getAuth(adminApp);

        await auth.setCustomUserClaims(userId, { superAdmin: true, role: 'admin' });
        return { success: true, message: 'Super admin claim set successfully.' };
    } catch (error) {
        console.error('Error setting super admin claim:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to set claim: ${errorMessage}` };
    }
}

// --- Super Admin: Grant Infinite Access ---
const grantInfiniteAccessSchema = z.object({
    clinicId: z.string().min(1, 'Clinic ID is required'),
});

export async function grantInfiniteAccessAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);

    const validatedFields = grantInfiniteAccessSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid clinic ID.' };
    }

    const { clinicId } = validatedFields.data;

    try {
        const clinicRef = firestore.collection('clinics').doc(clinicId);
        await clinicRef.update({
            'subscription.plan': 'infinite',
            'subscription.status': 'active',
            'subscription.expiryDate': null,
        });
        revalidatePath('/super-admin');
        return { success: true, message: 'Infinite access granted successfully!' };
    } catch (error) {
        console.error('Error granting infinite access:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to grant access: ${errorMessage}` };
    }
}

// --- Super Admin: Set Expiry Date ---
const setExpiryDateSchema = z.object({
    clinicId: z.string().min(1, 'Clinic ID is required'),
    expiryDate: z.string().min(1, 'Expiry date is required'),
});

export async function setExpiryDateAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);

    const validatedFields = setExpiryDateSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { clinicId, expiryDate } = validatedFields.data;

    try {
        const clinicRef = firestore.collection('clinics').doc(clinicId);
        await clinicRef.update({
            'subscription.expiryDate': new Date(expiryDate).toISOString(),
            'subscription.status': 'active', // Ensure status is active
        });
        revalidatePath('/super-admin');
        return { success: true, message: 'Subscription expiry updated!' };
    } catch (error) {
        console.error('Error setting expiry date:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to set expiry: ${errorMessage}` };
    }
}

// --- Super Admin: Revoke Access ---
const revokeAccessSchema = z.object({
    clinicId: z.string().min(1, 'Clinic ID is required'),
});

export async function revokeAccessAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);

    const validatedFields = revokeAccessSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid clinic ID.' };
    }

    const { clinicId } = validatedFields.data;

    try {
        const clinicRef = firestore.collection('clinics').doc(clinicId);
        await clinicRef.update({
            'subscription.plan': 'trial',
            'subscription.status': 'expired',
        });
        revalidatePath('/super-admin');
        return { success: true, message: 'Clinic access has been revoked.' };
    } catch (error) {
        console.error('Error revoking access:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to revoke access: ${errorMessage}` };
    }
}

// --- Super Admin: Delete Waitlist Entry ---
export async function deleteWaitlistEntryAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);
    const entryId = formData.get('entryId') as string;

    if (!entryId) {
        return { success: false, message: "Entry ID is missing." };
    }

    try {
        await firestore.collection('waitlist').doc(entryId).delete();
        revalidatePath('/super-admin/waitlist');
        return { success: true, message: "Waitlist entry deleted successfully." };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to delete entry: ${errorMessage}` };
    }
}

// --- Blog: Image Upload ---
export async function uploadImageAction(formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
    const imageFile = formData.get('image') as File;
    const apiKey = process.env.IMGBB_API_KEY;

    if (!imageFile) {
        return { success: false, message: 'No image file provided.' };
    }
    if (!apiKey) {
        return { success: false, message: 'ImgBB API key is not configured.' };
    }

    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: uploadFormData,
        });

        const result = await response.json();

        if (result.success) {
            return { success: true, message: 'Image uploaded successfully!', url: result.data.url };
        } else {
            return { success: false, message: result.error?.message || 'Failed to upload image.' };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Upload failed: ${errorMessage}` };
    }
}

// --- Blog: Save Post ---
const blogPostSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    status: z.enum(['draft', 'published']),
    metaDescription: z.string().optional(),
    clinicId: z.string().optional(),
    authorId: z.string(),
    authorName: z.string(),
    featuredImage: z.string().optional(),
    postId: z.string().optional(), // for updates
});

export async function saveBlogPostAction(formData: FormData) {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);

    const rawData = Object.fromEntries(formData.entries());

    let clinicId = rawData.clinicId as string;
    if (clinicId === 'no-clinic') {
        clinicId = '';
    }

    const validatedFields = blogPostSchema.safeParse({ ...rawData, clinicId });

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data', errors: validatedFields.error.flatten().fieldErrors };
    }

    const { postId, ...postData } = validatedFields.data;

    const slug = postData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const dataToSave = {
        ...postData,
        slug,
        publishedAt: postData.status === 'published' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
    };

    try {
        if (postId) {
            // This is an update
            await firestore.collection('blogPosts').doc(postId).set(dataToSave, { merge: true });
        } else {
            // This is a new post
            await firestore.collection('blogPosts').add(dataToSave);
        }
        revalidatePath('/super-admin/blog');
        revalidatePath('/super-admin/blog/edit');
        revalidatePath('/blog');
        revalidatePath(`/blog/${slug}`);
        return { success: true, message: `Blog post ${postId ? 'updated' : 'created'} successfully!` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to save post: ${errorMessage}` };
    }
}
