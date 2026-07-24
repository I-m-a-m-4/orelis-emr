
'use client';
import { useMemo, useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteWaitlistEntryAction } from '@/app/actions';

interface WaitlistEntry {
    id: string;
    email: string;
    timestamp: Timestamp;
}

function DeleteWaitlistEntryDialog({ entryId }: { entryId: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        const formData = new FormData();
        formData.append('entryId', entryId);
        const result = await deleteWaitlistEntryAction(formData);
        
        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        setOpen(false);
    };
    
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this waitlist entry.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function WaitlistPage() {
    const firestore = useFirestore();

    const waitlistQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'waitlist'), orderBy('timestamp', 'desc'));
    }, [firestore]);

    const { data: waitlist, loading } = useCollection<WaitlistEntry>(waitlistQuery);

    return (
        <div className="flex flex-col gap-4 noisy-bg">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">Waitlist Submissions</h1>
            </div>
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Waitlist</CardTitle>
                    <CardDescription>Emails collected from the waitlist page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Address</TableHead>
                                <TableHead>Date Submitted</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Loading submissions...</TableCell>
                                </TableRow>
                            ) : waitlist && waitlist.length > 0 ? waitlist.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{entry.email}</TableCell>
                                    <TableCell>{entry.timestamp ? format(entry.timestamp.toDate(), 'PPP p') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DeleteWaitlistEntryDialog entryId={entry.id} />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No submissions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
