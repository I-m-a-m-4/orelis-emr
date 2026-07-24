'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Pill, Search, ClipboardList, Package, Plus, CheckCircle2, AlertCircle, ShoppingCart, ExternalLink } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DashLoader } from "@/components/ui/dash-loader";
import type { Prescription, Medication } from "@/lib/types";

function InventoryErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort medications by name. Please ask your administrator to click the activation link in their console.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10 cursor-pointer">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZWRpY2F0aW9ucy9pbmRleGVzL18QARoMCghjbGluaWNJZBABGggKBG5hbWUQARoMCghfX25hbWVfXxAB" target="_blank">
                    Activate Medications Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

function PrescriptionErrorAlert() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Firestore requires a composite index to sort prescriptions by date. Please ask your administrator to click the activation link in their console.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10">
                <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=ClBwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wcmVzY3JpcHRpb25zL2luZGV4ZXMvXxABGgwKCGNsaW5pY0lkEAEaCAoEZGF0ZRACGgwKCF9fbmFtZV9fEAI" target="_blank">
                    Activate Prescriptions Index <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

export default function PharmacyPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    // Fetch Prescriptions
    const prescriptionsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'prescriptions'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('date', 'desc')
        );
    }, [userProfile, firestore]);
    const { data: prescriptions, loading: rxLoading, error: rxError } = useCollection<Prescription>(prescriptionsQuery);

    // Fetch Medications (Inventory)
    const medsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'medications'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('name', 'asc')
        );
    }, [userProfile, firestore]);
    const { data: medications, loading: medsLoading, error: medsError } = useCollection<Medication>(medsQuery);

    const filteredRx = useMemo(() => {
        if (!prescriptions) return [];
        return prescriptions.filter(rx =>
            rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rx.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [prescriptions, searchTerm]);

    const dispenseMedication = async (rx: Prescription) => {
        if (!firestore || !userProfile?.clinicId) return;
        setLoadingAction(rx.id);
        try {
            await updateDoc(doc(firestore, 'prescriptions', rx.id), {
                status: 'Dispensed',
                dispensedAt: new Date().toISOString(),
                dispensedBy: userProfile.name
            });

            toast({ title: "Dispensed", description: `Medications for ${rx.patientName} have been marked as dispensed.` });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                        <Pill className="text-primary" /> Pharmacy Management
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage prescriptions, dispense medications, and track drug inventory.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patients or prescriptions..."
                            className="pl-8 w-[250px] md:w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="prescriptions" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Prescriptions
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                        <Package className="h-4 w-4" /> Drug Store
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="prescriptions" className="mt-6">
                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Doctor's Orders</CardTitle>
                            <CardDescription>Recent prescriptions from clinical encounters.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {rxLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : rxError ? (
                                <PrescriptionErrorAlert />
                            ) : filteredRx.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Doctor</TableHead>
                                            <TableHead>Medications</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRx.map((rx) => (
                                            <TableRow key={rx.id}>
                                                <TableCell className="font-medium">{rx.patientName}</TableCell>
                                                <TableCell className="text-xs">{rx.doctorName}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs space-y-1">
                                                        {rx.medications.map((m, i) => (
                                                            <div key={i} className="text-muted-foreground">
                                                                {m.name} ({m.quantity} {m.dosage})
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">{new Date(rx.date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={rx.status === 'Dispensed' ? 'default' : rx.status === 'Cancelled' ? 'destructive' : 'outline'}
                                                        className={rx.status === 'Dispensed' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : ''}>
                                                        {rx.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {rx.status === 'Pending' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700 h-8 cursor-pointer"
                                                            onClick={() => dispenseMedication(rx)}
                                                            disabled={loadingAction === rx.id}
                                                        >
                                                            {loadingAction === rx.id ? <DashLoader size="sm" className="text-white" /> : 'Dispense Now'}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="font-medium text-lg">No prescriptions found</h3>
                                    <p className="text-muted-foreground max-w-xs">Waiting for doctors to finalize clinical encounters for the day.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inventory" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <Card className="bg-orange-500/5 border-orange-500/20">
                            <CardHeader className="p-4 pb-0">
                                <CardDescription className="text-xs font-bold uppercase text-orange-600">Total Items</CardDescription>
                                <CardTitle className="text-2xl">{medications?.length || 0}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-orange-400/5 border-orange-400/20">
                            <CardHeader className="p-4 pb-0">
                                <CardDescription className="text-xs font-bold uppercase text-orange-500">In Stock</CardDescription>
                                <CardTitle className="text-2xl">{medications?.filter(m => m.stock > 10).length || 0}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-red-500/5 border-red-500/20 shadow-sm animate-pulse">
                            <CardHeader className="p-4 pb-0">
                                <CardDescription className="text-xs font-bold uppercase text-red-600">Low Stock</CardDescription>
                                <CardTitle className="text-2xl">{medications?.filter(m => m.stock <= 10).length || 0}</CardTitle>
                            </CardHeader>
                        </Card>
                        <AddMedicationDialog clinicId={userProfile?.clinicId} />
                    </div>

                    <Card className="border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Drug Store Inventory</CardTitle>
                                <CardDescription>Track levels of medical supplies and life-saving medications.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {medsLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                    <div className="flex justify-center py-4">
                                        <DashLoader size="md" />
                                    </div>
                                </div>
                            ) : medsError ? (
                                <InventoryErrorAlert />
                            ) : medications && medications.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Medication Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Current Stock</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {medications.map((med) => (
                                            <TableRow key={med.id}>
                                                <TableCell className="font-semibold underline decoration-dotted underline-offset-4">{med.name}</TableCell>
                                                <TableCell><Badge variant="outline">{med.category}</Badge></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className={med.stock <= 10 ? 'text-red-500 font-bold' : ''}>
                                                            {med.stock} {med.unit}
                                                        </span>
                                                        {med.stock <= 10 && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}</TableCell>
                                                <TableCell>₦{med.price.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <StockUpdateDialog medication={med} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                                    <Pill className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="font-medium text-lg">Drug store is empty</h3>
                                    <p className="text-muted-foreground max-w-xs">Start by adding medications to your pharmacy inventory.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AddMedicationDialog({ clinicId }: { clinicId?: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !clinicId) return;
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            await addDoc(collection(firestore, 'medications'), {
                clinicId,
                name: formData.get('name'),
                category: formData.get('category'),
                stock: parseInt(formData.get('stock') as string),
                unit: formData.get('unit'),
                price: parseFloat(formData.get('price') as string),
                expiryDate: formData.get('expiryDate'),
                createdAt: serverTimestamp()
            });
            toast({ title: "Success", description: "Medication added to drug store." });
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-full border-dashed bg-primary/10 text-primary hover:bg-primary/20" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add New Medication
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Stock Drug Store</DialogTitle>
                        <DialogDescription>Add a new pharmaceutical item to your clinic inventory.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Drug Name</Label>
                            <Input id="name" name="name" className="col-span-3" placeholder="e.g. Paracetamol" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <Select name="category" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Analgesics">Analgesics</SelectItem>
                                    <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                                    <SelectItem value="Antimalarials">Antimalarials</SelectItem>
                                    <SelectItem value="Antihypertensives">Antihypertensives</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stock" className="text-right">Initial Stock</Label>
                            <Input id="stock" name="stock" type="number" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit" className="text-right">Unit</Label>
                            <Input id="unit" name="unit" className="col-span-3" placeholder="e.g. Tabs, Vials" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Unit Price</Label>
                            <Input id="price" name="price" type="number" step="0.01" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expiryDate" className="text-right">Expiry Date</Label>
                            <Input id="expiryDate" name="expiryDate" type="date" className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add to Inventory'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function StockUpdateDialog({ medication }: { medication: Medication }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const addAmount = parseInt(formData.get('amount') as string);

        try {
            await updateDoc(doc(firestore, 'medications', medication.id), {
                stock: increment(addAmount)
            });
            toast({ title: "Updated", description: `Added ${addAmount} items to ${medication.name}.` });
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 cursor-pointer">Update Stock</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[350px]">
                <form onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>Update {medication.name}</DialogTitle>
                        <DialogDescription>Increase stock levels for this medication.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2 text-center">
                            <p className="text-sm font-medium">Current Stock: {medication.stock} {medication.unit}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Add Stock Amount</Label>
                            <Input id="amount" name="amount" type="number" defaultValue="10" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Updating...' : 'Confirm Stock Increase'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
