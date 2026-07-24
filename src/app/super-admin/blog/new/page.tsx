
'use client';
import { useState, useMemo, type FormEvent, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Clinic } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { saveBlogPostAction, uploadImageAction } from '@/app/actions';
import { collection, query } from 'firebase/firestore';
import Image from 'next/image';

export default function NewBlogPostPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [featuredImage, setFeaturedImage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clinicsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'clinics'));
    }, [firestore]);
    const { data: clinics, loading: clinicsLoading } = useCollection<Clinic>(clinicsQuery);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        
        const result = await uploadImageAction(formData);

        if (result.success && result.url) {
            setFeaturedImage(result.url);
            toast({ title: "Success!", description: "Image uploaded successfully." });
        } else {
            toast({ title: "Upload Failed", description: result.message, variant: "destructive" });
        }
        setIsUploading(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to create a post.", variant: "destructive"});
            setIsSaving(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        formData.append('authorId', user.uid);
        formData.append('authorName', 'Orelis'); // Set author name to Orelis
        formData.append('featuredImage', featuredImage);

        const result = await saveBlogPostAction(formData);

        if (result.success) {
            toast({ title: "Success!", description: result.message });
            router.push('/super-admin/blog');
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        
        setIsSaving(false);
    };

    return (
        <div className="flex flex-col gap-4 noisy-bg">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Create Blog Post</h1>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>Content</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Post Title</Label>
                                    <Input id="title" name="title" placeholder="The Future of AI in Healthcare" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content">Body (Markdown Supported)</Label>
                                    <Textarea id="content" name="content" placeholder="Write your amazing blog post here..." className="min-h-[400px]" required />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                         <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>Publish Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select name="status" defaultValue="draft">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Featured Image</Label>
                                    {featuredImage && (
                                        <div className="relative aspect-video w-full">
                                            <Image src={featuredImage} alt="Featured image preview" fill className="object-cover rounded-md" />
                                        </div>
                                    )}
                                    <Input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        onChange={handleImageUpload} 
                                        accept="image/*"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full gap-2" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                                        {isUploading ? 'Uploading...' : 'Upload Image'}
                                    </Button>
                                    <Input name="featuredImageInput" value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} placeholder="Or paste image URL" />

                                </div>
                            </CardContent>
                        </Card>
                         <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>SEO & Metadata</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <div className="space-y-2">
                                    <Label htmlFor="metaDescription">Meta Description</Label>
                                    <Textarea id="metaDescription" name="metaDescription" placeholder="A short, compelling summary for search engines." maxLength={160} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="clinicId">Feature a Clinic (Optional)</Label>
                                    <Select name="clinicId" disabled={clinicsLoading}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={clinicsLoading ? "Loading..." : "Select a clinic"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no-clinic">None</SelectItem>
                                            {clinics?.map(clinic => (
                                                <SelectItem key={clinic.id!} value={clinic.id!}>{clinic.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="button-glow">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Post'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
