
'use client';
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { BlogPost } from "@/lib/types";

export function BlogDashboardClientPage({ posts }: { posts: BlogPost[] }) {

    return (
        <div className="flex flex-col gap-4 noisy-bg">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Blog Management</h1>
                <div className="ml-auto">
                    <Button size="sm" className="h-8 gap-1" asChild>
                        <Link href="/super-admin/blog/new">
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Add Post
                            </span>
                        </Link>
                    </Button>
                </div>
            </div>
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Blog Posts</CardTitle>
                    <CardDescription>Create, edit, and manage all blog posts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Author</TableHead>
                                <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!posts ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Loading posts...</TableCell>
                                </TableRow>
                            ) : posts.length > 0 ? posts.map(post => (
                                <TableRow key={post.id}>
                                    <TableCell className="font-medium">{post.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'} className={post.status === 'published' ? 'bg-orange-500/10 text-orange-300' : ''}>
                                            {post.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{post.authorName}</TableCell>
                                    <TableCell className="hidden md:table-cell">{post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/super-admin/blog/${post.id}/edit`}>Edit</Link>
                                            </DropdownMenuItem>
                                            {post.status === 'published' && <DropdownMenuItem asChild><Link href={`/blog/${post.slug}`} target="_blank">View Live Post</Link></DropdownMenuItem>}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No posts found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
