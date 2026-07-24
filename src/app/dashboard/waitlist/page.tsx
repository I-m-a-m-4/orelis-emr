'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Mailbox, Plus, Search, Phone, User, Clock, Trash2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { DashLoader } from "@/components/ui/dash-loader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { WaitlistEntry, UserProfile } from "@/lib/types";

function WaitlistIndexErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort the clinic waitlist by join date. Please ask your administrator to click the activation link in their console.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=ClBwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy93YWl0bGlzdC9pbmRleGVzL18QARoMCghjbGluaWNJZBABGgwKCGpvaW5lZEF0EAEaDAoIX19uYW1lX18QAQ" target="_blank">
                    Activate Waitlist Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

export default function WaitlistPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newService, setNewService] = useState('');
    const [newPriority, setNewPriority] = useState<'Normal' | 'High'>('Normal');

    // Load user profile
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Load waitlist
    const waitlistQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'waitlist'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('joinedAt', 'asc')
        );
    }, [firestore, userProfile?.clinicId]);

    const { data: waitlist, loading, error: waitlistError } = useCollection<WaitlistEntry>(waitlistQuery);

    const filteredWaitlist = useMemo(() => {
        if (!waitlist) return [];
        return waitlist.filter(entry =>
            entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.serviceRequested.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.phone.includes(searchTerm)
        );
    }, [waitlist, searchTerm]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !userProfile?.clinicId) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'waitlist'), {
                clinicId: userProfile.clinicId,
                patientName: newName,
                phone: newPhone,
                serviceRequested: newService,
                priority: newPriority,
                joinedAt: new Date().toISOString(),
                status: 'Waiting'
            });

            toast({
                title: "Added to Waitlist",
                description: `${newName} has been added to the queue.`
            });

            setIsAddModalOpen(false);
            setNewName('');
            setNewPhone('');
            setNewService('');
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to add to waitlist. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: WaitlistEntry['status']) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'waitlist', id), { status });
            toast({ title: "Status Updated", description: `Patient is now ${status.toLowerCase()}.` });
        } catch (e) {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };

    const removeEntry = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'waitlist', id));
            toast({ title: "Removed", description: "Entry has been removed from the waitlist." });
        } catch (e) {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-2xl tracking-tight">Waitlist Management</h1>
                    <p className="text-muted-foreground text-sm">Efficiently manage patient queues and consultation flows.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="button-glow">
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Waitlist
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Waitlist Entry</DialogTitle>
                            <DialogDescription>Add a patient to the current clinic queue.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddEntry} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Patient Name</Label>
                                <Input id="name" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" required value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="080XXXXXXXX" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service">Service Requested</Label>
                                <Input id="service" required value={newService} onChange={e => setNewService(e.target.value)} placeholder="e.g. Consultation, Lab Test" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={newPriority} onValueChange={(val: any) => setNewPriority(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High (Urgent)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? <DashLoader size="sm" className="text-white" /> : "Add to Queue"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-dashed backdrop-blur-sm bg-background/50">
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 w-full max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find entry..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background/50 shadow-none border-none outline-none focus-visible:ring-0"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Live Queue: {filteredWaitlist.filter(e => e.status === 'Waiting').length} waiting
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <DashLoader size="lg" className="text-primary" />
                        </div>
                    ) : waitlistError ? (
                        <WaitlistIndexErrorAlert />
                    ) : filteredWaitlist.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Queue #</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWaitlist.map((entry, index) => (
                                        <TableRow key={entry.id} className={entry.priority === 'High' ? 'bg-orange-500/5' : ''}>
                                            <TableCell className="font-mono text-xs">#{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium flex items-center gap-2">
                                                    {entry.patientName}
                                                    {entry.priority === 'High' && <Badge variant="destructive" className="text-[10px] py-0 h-4">High</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {entry.phone}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{entry.serviceRequested}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    entry.status === 'Waiting' ? 'secondary' :
                                                        entry.status === 'Called' ? 'outline' :
                                                            'default'
                                                } className={entry.status === 'Called' ? 'border-orange-500 text-orange-500' : ''}>
                                                    {entry.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(entry.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {entry.status === 'Waiting' && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-500" onClick={() => updateStatus(entry.id, 'Called')} title="Call Patient">
                                                            <Phone className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {entry.status === 'Called' && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => updateStatus(entry.id, 'Seen')} title="Mark as Seen">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeEntry(entry.id)} title="Remove">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed flex flex-col items-center">
                            <Mailbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="font-medium text-lg">Waitlist is Empty</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">There are no patients currently waiting in the clinic queue.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
