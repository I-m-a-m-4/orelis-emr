
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';

function DeleteBroadcastDialog({ broadcastId }: { broadcastId: string }) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleDelete = async () => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'broadcasts', broadcastId));
            toast({ title: "Success", description: "Broadcast deleted." });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete broadcast.", variant: "destructive" });
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the broadcast notification. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


export default function SuperAdminNotificationsPage() {
    const firestore = useFirestore();
    const broadcastsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'broadcasts'), orderBy('timestamp', 'desc'));
    }, [firestore]);

    const { data: broadcasts, loading } = useCollection<Notification>(broadcastsQuery);

    return (
        <div className="flex flex-col gap-4 noisy-bg">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Broadcast Management</h1>
                 <div className="ml-auto">
                    <Button size="sm" className="h-8 gap-1" asChild>
                        <Link href="/super-admin/notifications/new">
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                New Broadcast
                            </span>
                        </Link>
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Sent Broadcasts</CardTitle>
                    <CardDescription>A history of all broadcast notifications sent to clinic admins.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Date Sent</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Loading broadcasts...</TableCell></TableRow>
                            ) : broadcasts && broadcasts.length > 0 ? (
                                broadcasts.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.title}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-sm truncate">{b.message}</TableCell>
                                        <TableCell>{new Date(b.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem disabled>Edit (Coming Soon)</DropdownMenuItem>
                                                    <DeleteBroadcastDialog broadcastId={b.id} />
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center">No broadcasts sent yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

