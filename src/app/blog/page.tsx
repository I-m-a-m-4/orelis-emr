
import type { Metadata } from 'next';
import type { BlogPost } from '@/lib/types';
import { BlogClientPage } from './client-page';
import { blogPosts as hardcodedBlogPosts } from '@/lib/blog-data';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'The Orelis Blog. Latest news, updates, case studies, and stories on the future of patient care and healthcare technology.',
};

// Revalidate this page every hour to fetch new posts
export const revalidate = 3600;

async function getPosts(): Promise<BlogPost[]> {
    let dynamicPosts: BlogPost[] = [];
    try {
        const adminApp = await initializeAdminApp();
        const firestore = getFirestore(adminApp);
        const postsRef = firestore.collection('blogPosts');
        const snapshot = await postsRef.where('status', '==', 'published').get();

        if (!snapshot.empty) {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                dynamicPosts.push({
                    id: doc.id,
                    ...data,
                } as BlogPost);
            });
        }
    } catch (error) {
        console.error("Error fetching dynamic posts:", error);
    }
    
    // Combine and deduplicate, giving priority to dynamic posts
    const combinedPosts = [...dynamicPosts, ...hardcodedBlogPosts];
    const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.slug, post])).values());

    return uniquePosts
        .filter(post => post.status === 'published' && post.publishedAt)
        .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
}

export default async function BlogPage() {
    const posts = await getPosts();

    return <BlogClientPage posts={posts} />;
}
