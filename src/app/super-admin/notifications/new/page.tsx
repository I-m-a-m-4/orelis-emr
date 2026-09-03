'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query } from 'firebase/firestore';
import { ArrowLeft, Megaphone, Send } from 'lucide-react';

import { useFirestore, useUser, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DashLoader } from '@/components/ui/dash-loader';
import type { Clinic } from '@/lib/types';

/**
 * Compose a platform broadcast.
 *
 * The "New Broadcast" button on /super-admin/notifications has always linked
 * here, but the route file was empty — which is a build error rather than a
 * missing feature, since a route with no default export is not a module. The
 * shape written below matches what the broadcast list reads back (`title`,
 * `message`, `timestamp`) and the `Broadcast` type in src/lib/types.ts.
 *
 * Writes go straight to `broadcasts`, which no rule names explicitly and so falls
 * to the super-admin catch-all at the bottom of firestore.rules.
 */
export default function NewBroadcastPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [sending, setSending] = useState(false);
    const [type, setType] = useState<'announcement' | 'info' | 'warning' | 'subscription'>('announcement');
    const [target, setTarget] = useState('all');

    // Offered as targets so a broadcast can be aimed at one hospital rather than
    // the whole platform.
    const clinicsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'clinics'));
    }, [firestore]);
    const { data: clinics } = useCollection<Clinic>(clinicsQuery);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) return;

        const formData = new FormData(event.currentTarget);
        const title = (formData.get('title') as string)?.trim();
        const message = (formData.get('message') as string)?.trim();

        if (!title || !message) {
            toast({
                title: 'Missing details',
                description: 'A broadcast needs both a title and a message.',
                variant: 'destructive',
            });
            return;
        }

        setSending(true);
        try {
            const now = new Date().toISOString();
            await addDoc(collection(firestore, 'broadcasts'), {
                title,
                message,
                type,
                target,
                link: (formData.get('link') as string)?.trim() || null,
                read: false,
                timestamp: now,
                createdAt: now,
                createdBy: user?.uid ?? null,
            });

            toast({
                title: 'Broadcast sent',
                description: target === 'all'
                    ? 'Delivered to every clinic on the platform.'
                    : 'Delivered to the selected clinic.',
            });
            router.push('/super-admin/notifications');
        } catch (err: any) {
            toast({
                title: 'Could not send',
                description: err?.message ?? 'Unknown error.',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/super-admin/notifications" aria-label="Back to broadcasts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                    <Megaphone className="text-primary h-5 w-5" /> New Broadcast
                </h1>
            </div>

            <Card className="border-dashed max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Compose</CardTitle>
                        <CardDescription>
                            This appears in the notification tray of every clinic admin you target.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g. Scheduled maintenance this Sunday"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                name="message"
                                rows={5}
                                placeholder="What do clinics need to know?"
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="type">Category</Label>
                                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="announcement">Announcement</SelectItem>
                                        <SelectItem value="info">Information</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="subscription">Subscription</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target">Audience</Label>
                                <Select value={target} onValueChange={setTarget}>
                                    <SelectTrigger id="target">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Every clinic</SelectItem>
                                        {clinics?.map((c) => (
                                            <SelectItem key={c.id} value={c.id ?? ''}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="link">
                                Link <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input id="link" name="link" placeholder="/dashboard/settings" />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild disabled={sending}>
                            <Link href="/super-admin/notifications">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={sending} className="button-glow">
                            {sending
                                ? <DashLoader size="sm" className="text-white" />
                                : <><Send className="mr-2 h-4 w-4" /> Send Broadcast</>}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
