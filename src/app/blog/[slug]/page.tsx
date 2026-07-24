
import type { BlogPost } from '@/lib/types';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';
import Link from 'next/link';
import { blogPosts as hardcodedBlogPosts } from '@/lib/blog-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Twitter } from 'lucide-react';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

// Revalidate this page every hour to fetch updates
export const revalidate = 3600;

async function getPost(slug: string): Promise<BlogPost | null> {
    // First, try to fetch from Firestore
    try {
        const adminApp = await initializeAdminApp();
        const firestore = getFirestore(adminApp);
        const postsRef = firestore.collection('blogPosts');
        const snapshot = await postsRef.where('slug', '==', slug).where('status', '==', 'published').limit(1).get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as BlogPost;
        }
    } catch (error) {
        console.error("Error fetching dynamic post:", error);
    }

    // If not found in Firestore, check the hardcoded list
    const post = hardcodedBlogPosts.find(p => p.slug === slug && p.status === 'published');
    return post || null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const post = await getPost(params.slug);

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    return {
        title: post.title,
        description: post.metaDescription,
        openGraph: {
            title: post.title,
            description: post.metaDescription,
            type: 'article',
            images: post.featuredImage ? [post.featuredImage] : [],
        },
    };
}


export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = await getPost(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
            <PublicHeader />
            <main className="pt-16 noisy-bg">
                <article>
                    <header className="relative py-24 sm:py-32 md:py-40">
                         <div className="absolute inset-0">
                            {post.featuredImage && (
                                <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            )}
                             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
                        </div>
                        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                             <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold my-2 font-headline text-white drop-shadow-lg">
                                {post.title}
                            </h1>
                             <div className="mt-6 flex items-center justify-center gap-4">
                                <Avatar>
                                    <AvatarImage src={post.authorId === 'orelis-team' ? '/orelis-avatar.png' : `https://i.pravatar.cc/150?u=${post.authorId}`} alt={post.authorName} />
                                    <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-white">{post.authorName}</p>
                                    <p className="font-sans text-sm text-zinc-400">
                                        Published on {new Date(post.publishedAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                             </div>
                        </div>
                    </header>
                
                    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
                        <div className="prose prose-invert prose-lg mx-auto max-w-none prose-p:text-zinc-300 prose-headings:text-primary prose-headings:font-headline prose-a:text-primary prose-strong:text-white prose-blockquote:border-l-primary prose-blockquote:text-zinc-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {post.content}
                            </ReactMarkdown>
                        </div>
                        
                        <div className="mt-16 border-t border-dashed border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={post.authorId === 'orelis-team' ? '/orelis-avatar.png' : `https://i.pravatar.cc/150?u=${post.authorId}`} alt={post.authorName} />
                                    <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-white">About the Author</p>
                                    <p className="text-zinc-400 text-sm">{post.authorName === 'Orelis' ? 'The official Orelis team account.' : 'The Orelis Team consists of healthcare experts, developers, and designers passionate about improving patient care through technology.'}</p>
                                </div>
                            </div>
                            <Link href="#" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                                <Twitter className="h-4 w-4" /> Follow on Twitter
                            </Link>
                        </div>
                    </div>
                </article>
            </main>
            <Footer />
        </div>
    );
}

// This function tells Next.js which slugs to pre-render at build time.
export async function generateStaticParams() {
    let dynamicPosts: BlogPost[] = [];
    try {
        const adminApp = await initializeAdminApp();
        const firestore = getFirestore(adminApp);
        const postsRef = firestore.collection('blogPosts');
        const snapshot = await postsRef.where('status', '==', 'published').get();
        if (!snapshot.empty) {
            dynamicPosts = snapshot.docs.map(doc => ({ slug: doc.data().slug } as BlogPost));
        }
    } catch (error) {
        console.error("Error fetching dynamic slugs for static generation:", error);
    }
    
    const allPosts = [...hardcodedBlogPosts, ...dynamicPosts];
    const uniqueSlugs = Array.from(new Set(allPosts.map(post => post.slug)));
    
    return uniqueSlugs.map(slug => ({
        slug,
    }));
}
