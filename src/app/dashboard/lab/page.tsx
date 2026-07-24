'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { FlaskConical, Plus, Search, User, FileText, CheckCircle2, FlaskRound, Timer, AlertCircle, ExternalLink } from 'lucide-react';
import { DashLoader } from "@/components/ui/dash-loader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LabOrder, UserProfile } from "@/lib/types";

function LabIndexErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort Laboratory Orders by request date. Click the button below to activate it.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10 cursor-pointer">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9sYWJfb3JkZXJzL2luZGV4ZXMvXxABGgwKCGNsaW5pY0lkEAEaDwoLcmVxdWVzdGVkQXQQAhoMCghfX25hbWVfXxAC" target="_blank">
                    Activate Lab Orders Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

export default function LaboratoryPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [patientId, setPatientId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [testType, setTestType] = useState('');
    const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'Emergency'>('Routine');

    // Load user profile
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Load Lab Orders
    const labQuery = useMemo(() => {
        if (!firestore || !userProfile?.clinicId) return null;
        return query(
            collection(firestore, 'lab_orders'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('requestedAt', 'desc')
        );
    }, [firestore, userProfile?.clinicId]);

    const { data: orders, loading, error: labError } = useCollection<LabOrder>(labQuery);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        return orders.filter(order =>
            order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.testType.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orders, searchTerm]);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !userProfile?.clinicId) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'lab_orders'), {
                clinicId: userProfile.clinicId,
                patientId: patientId || 'walk-in',
                patientName,
                testType,
                priority,
                requestedBy: userProfile.name,
                requestedAt: new Date().toISOString(),
                status: 'Pending'
            });

            toast({ title: "Order Created", description: `Laboratory request for ${patientName} has been recorded.` });
            setIsAddModalOpen(false);
            setPatientName('');
            setTestType('');
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to create lab request.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: LabOrder['status']) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'lab_orders', id), { status });
            toast({ title: "Status Updated", description: `Order is now ${status.toLowerCase()}.` });
        } catch (e) {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-2xl tracking-tight">Laboratory Management</h1>
                    <p className="text-muted-foreground text-sm">Manage test requests, diagnostic results, and lab workflow.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="button-glow">
                            <Plus className="mr-2 h-4 w-4" />
                            New Lab Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Laboratory Test Request</DialogTitle>
                            <DialogDescription>Create a new diagnostic order for a patient.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateOrder} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="pName">Patient Name</Label>
                                <Input id="pName" required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full Name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="test">Test Type</Label>
                                <Input id="test" required value={testType} onChange={e => setTestType(e.target.value)} placeholder="e.g. Malaria Parasite, Full Blood Count" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Routine">Routine</SelectItem>
                                        <SelectItem value="Urgent">Urgent</SelectItem>
                                        <SelectItem value="Emergency">Emergency (STAT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? <DashLoader size="sm" className="text-white" /> : "Create Request"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-dashed backdrop-blur-sm bg-background/50">
                <CardHeader>
                    <div className="flex items-center gap-2 flex-1 w-full max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find patient or test..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background/50 border-none outline-none focus-visible:ring-0"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <DashLoader size="lg" />
                        </div>
                    ) : labError ? (
                        <LabIndexErrorAlert />
                    ) : filteredOrders.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Requested</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Test / Investigation</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id} className={order.priority === 'Emergency' ? 'bg-red-500/5' : ''}>
                                            <TableCell className="text-xs">
                                                {new Date(order.requestedAt).toLocaleDateString()}
                                                <div className="text-[10px] text-muted-foreground">{new Date(order.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium flex items-center gap-2">
                                                    {order.patientName}
                                                    {order.priority !== 'Routine' && (
                                                        <Badge variant={order.priority === 'Emergency' ? 'destructive' : 'secondary'} className="text-[10px] py-0 h-4 uppercase">
                                                            {order.priority}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-2">
                                                    <FlaskRound className="h-3 w-3 text-primary" />
                                                    {order.testType}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    order.status === 'Completed' ? 'default' :
                                                        order.status === 'In Progress' ? 'outline' :
                                                            'secondary'
                                                } className={order.status === 'In Progress' ? 'border-orange-500 text-orange-500' : ''}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {order.status === 'Pending' && (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(order.id, 'In Progress')}>
                                                            Start Test
                                                        </Button>
                                                    )}
                                                    {order.status === 'In Progress' && (
                                                        <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => updateStatus(order.id, 'Completed')}>
                                                            Record Results
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                        <FileText className="h-4 w-4" />
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
                            <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="font-medium text-lg">No Pending Requests</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">There are no laboratory investigations requested for the clinic at the moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
