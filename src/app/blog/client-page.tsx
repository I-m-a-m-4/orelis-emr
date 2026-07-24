
'use client';

import type { BlogPost } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { OrelisLogo } from '@/components/layout/orelis-logo';
import { Footer } from '@/components/layout/footer';
import { PublicHeader } from '@/components/layout/public-header';

const BlogGrid = ({ posts }: { posts: BlogPost[] }) => {
    if (!posts || posts.length === 0) {
        return <p className="text-center text-muted-foreground col-span-full">No blog posts found.</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group block bg-card border border-border transition-all duration-300 hover:border-primary">
                     <div className="relative w-full h-56 overflow-hidden">
                        {post.featuredImage ? (
                            <Image
                                src={post.featuredImage}
                                alt={post.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                             <div className="w-full h-full bg-muted flex items-center justify-center">
                                <OrelisLogo />
                             </div>
                        )}
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{post.metaDescription}</p>
                         <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                            <span>{post.authorName}</span>
                            <span>&middot;</span>
                             <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};


export function BlogClientPage({ posts }: { posts: BlogPost[] }) {
    return (
        <div className="bg-background text-foreground transition-colors duration-300">
          <PublicHeader />

          <main className="pt-16">
            <section className="py-24 sm:py-32 noisy-bg">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold my-2 group font-headline text-foreground">
                  The Orelis Blog
                </h1>
                <p className="font-sans my-2 text-lg sm:text-xl text-muted-foreground">
                  News, updates, and stories on the future of patient care.
                </p>
              </div>
            </section>

            <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <BlogGrid posts={posts} />
            </div>
          </main>
          <Footer />
        </div>
      );
}
