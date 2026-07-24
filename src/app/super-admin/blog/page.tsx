
import type { Metadata } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import type { BlogPost } from '@/lib/types';
import { BlogDashboardClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'Blog Management',
  description: 'Create, edit, and manage all blog posts for Orelis.',
};

async function getPosts(): Promise<BlogPost[]> {
    try {
        const adminApp = await initializeAdminApp();
        const firestore = getFirestore(adminApp);
        const postsRef = firestore.collection('blogPosts');
        const snapshot = await postsRef.orderBy('updatedAt', 'desc').get();

        if (snapshot.empty) {
            return [];
        }

        const posts: BlogPost[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            posts.push({
                id: doc.id,
                ...data,
                publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : null,
                updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
            } as BlogPost);
        });
        
        return posts;
    } catch (error) {
        console.error("Error fetching posts for admin:", error);
        return [];
    }
}


export default async function BlogDashboardPage() {
    const posts = await getPosts();
    return <BlogDashboardClientPage posts={posts} />;
}
