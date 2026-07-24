
import { MetadataRoute } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import type { BlogPost } from '@/lib/types';
import { blogPosts as hardcodedBlogPosts } from '@/lib/blog-data';

const URL = 'https://orelis.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic blog posts from Firestore
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
          publishedAt: data.publishedAt || data.updatedAt,
          updatedAt: data.updatedAt,
        } as BlogPost);
      });
    }
  } catch (error) {
    console.error("Error fetching dynamic posts for sitemap:", error);
  }

  // Combine dynamic and hardcoded posts
  const allPosts = [...dynamicPosts, ...hardcodedBlogPosts];
  const uniquePosts = Array.from(new Map(allPosts.map(post => [post.slug, post])).values());

  const blogPostEntries: MetadataRoute.Sitemap = uniquePosts
    .filter(post => post.status === 'published' && post.slug)
    .map(post => ({
      url: `${URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt!),
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

  // Define static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${URL}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
     {
      url: `${URL}/pitch`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${URL}/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
  ];

  return [
    ...staticRoutes,
    ...blogPostEntries,
  ];
}
