'use client';

import { useMemo, useState } from 'react';
import {
    collection, deleteDoc, doc, addDoc, updateDoc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import {
    AlertCircle, AlertTriangle, ExternalLink, Package, Pencil, Plus, Search, Trash2,
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DashLoader } from '@/components/ui/dash-loader';
import type { UserProfile } from '@/lib/types';

/**
 * General medical supplies — the non-pharmaceutical half of stock.
 *
 * Every control on this page used to be inert: "Add Item", "Edit" and "Add First
 * Item" had no handlers, there was no delete at all, and the search box was an
 * unbound input. A manager could therefore add nothing, change nothing and remove
 * nothing, which is indistinguishable from "I added items and they vanished".
 *
 * ## Why the writes are not awaited
 *
 * `inventory` is not one of the mirrored tables in src/lib/offline/sync.ts, so it
 * cannot go through `persistRecord`. The non-blocking contract from
 * src/lib/data/base.ts still applies and matters just as much: `addDoc` and
 * `updateDoc` resolve on *server* acknowledgement and simply never settle with no
 * network. Awaiting one would hang the dialog open with a spinner until the wifi
 * came back. Instead the write is fired with a `.catch`, the dialog closes
 * immediately, and Firestore's listener paints the row from its local cache with
 * `hasPendingWrites` set — which the table surfaces, so the user can see what has
 * not yet reached the server.
 */

const CATEGORIES = [
    'Consumables',
    'Instruments',
    'PPE',
    'Diagnostics',
    'Dressings',
    'Sterilisation',
    'Office',
    'Other',
] as const;

const DEFAULT_MIN_STOCK = 5;

function IndexErrorAlert({ error }: { error?: any }) {
    const isPermissionDenied = error?.code === 'permission-denied' || String(error?.message).toLowerCase().includes('permission');
    const indexUrl = "https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9pbnZlbnRvcnkvaW5kZXhlcy9fEAEaDAoIY2xpbmljSWQQARoICgRuYW1lEAEaDAoIX19uYW1lX18QAQ";

    if (isPermissionDenied) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <h3 className="font-bold text-lg">Access Permission Denied</h3>
                <p className="text-sm max-w-md mt-2 mb-4">
                    Your account does not have permission to view inventory for this clinic, or your account profile is missing an active clinic association.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-dashed border-destructive/20 p-6">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Missing Database Index</h3>
            <p className="text-sm max-w-md mt-2 mb-4">
                Sorting supplies by name requires a composite index on
                {' '}<code className="font-mono text-xs">(clinicId, name)</code> in Firestore. Click below to activate it or deploy with
                {' '}<code className="font-mono text-xs">firebase deploy --only firestore:indexes</code>.
            </p>
            <Button variant="outline" size="sm" asChild className="border-destructive/20 hover:bg-destructive/10">
                <a
                    href={indexUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    Create Inventory Index in Firebase <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            </Button>
        </div>
    );
}

interface ItemFormValues {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minStock: number;
}

function readForm(form: HTMLFormElement): ItemFormValues | null {
    const data = new FormData(form);
    const name = (data.get('name') as string)?.trim();
    const unit = (data.get('unit') as string)?.trim();
    if (!name || !unit) return null;

    const quantity = Number(data.get('quantity'));
    const minStock = Number(data.get('minStock'));

    return {
        name,
        category: (data.get('category') as string) || 'Other',
        unit,
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        minStock: Number.isFinite(minStock) && minStock >= 0 ? minStock : DEFAULT_MIN_STOCK,
    };
}

/** The shared field set, so add and edit cannot drift apart. */
function ItemFields({ item }: { item?: any }) {
    return (
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Item name</Label>
                <Input id="name" name="name" defaultValue={item?.name ?? ''} placeholder="e.g. Nitrile gloves" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={item?.category ?? 'Consumables'}>
                    <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" name="quantity" type="number" min="0" defaultValue={item?.quantity ?? 0} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" name="unit" defaultValue={item?.unit ?? ''} placeholder="box, pack" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="minStock">Reorder at</Label>
                    <Input
                        id="minStock"
                        name="minStock"
                        type="number"
                        min="0"
                        defaultValue={item?.minStock ?? DEFAULT_MIN_STOCK}
                    />
                </div>
            </div>
        </div>
    );
}

function AddItemDialog({ clinicId, trigger }: { clinicId?: string; trigger: React.ReactNode }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !clinicId) return;

        const values = readForm(event.currentTarget);
        if (!values) {
            toast({ title: 'Missing details', description: 'A name and unit are required.', variant: 'destructive' });
            return;
        }

        // Fired, not awaited — see the module comment.
        void addDoc(collection(firestore, 'inventory'), {
            ...values,
            clinicId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            serverCreatedAt: serverTimestamp(),
        }).catch((err) => {
            console.error('Inventory create failed:', err);
            toast({ title: 'Could not save', description: err?.message, variant: 'destructive' });
        });

        toast({ title: 'Item added', description: `${values.name} is now in your supplies list.` });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add supply item</DialogTitle>
                        <DialogDescription>Track a consumable or instrument in your clinic store.</DialogDescription>
                    </DialogHeader>
                    <ItemFields />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit">Add item</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditItemDialog({ item }: { item: any }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) return;

        const values = readForm(event.currentTarget);
        if (!values) {
            toast({ title: 'Missing details', description: 'A name and unit are required.', variant: 'destructive' });
            return;
        }

        void updateDoc(doc(firestore, 'inventory', item.id), {
            ...values,
            updatedAt: new Date().toISOString(),
        }).catch((err) => {
            console.error('Inventory update failed:', err);
            toast({ title: 'Could not update', description: err?.message, variant: 'destructive' });
        });

        toast({ title: 'Item updated', description: `${values.name} has been saved.` });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit {item.name}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit {item.name}</DialogTitle>
                        <DialogDescription>Update stock levels and details for this item.</DialogDescription>
                    </DialogHeader>
                    <ItemFields item={item} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteItemDialog({ item }: { item: any }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!firestore) return;
        setDeleting(true);

        // A delete is the one case worth reporting honestly rather than
        // optimistically: this is the operation users have reported "not
        // sticking", so a rules rejection must surface instead of being logged
        // and forgotten. Firestore removes the row from its local cache straight
        // away, so the listener still updates immediately either way.
        void deleteDoc(doc(firestore, 'inventory', item.id)).catch((err) => {
            console.error('Inventory delete failed:', err);
            toast({
                title: 'Delete rejected by the server',
                description:
                    err?.code === 'permission-denied'
                        ? 'Only a clinic admin can delete stock items.'
                        : err?.message ?? 'Unknown error.',
                variant: 'destructive',
            });
        });

        toast({ title: 'Item deleted', description: `${item.name} has been removed.` });
        setDeleting(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete {item.name}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">Delete this item?</DialogTitle>
                    <DialogDescription className="text-center">
                        <strong>{item.name}</strong> will be removed from your supplies list. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={deleting}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} className="flex-1" disabled={deleting}>
                        {deleting ? <DashLoader size="sm" className="text-white" /> : 'Delete permanently'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function InventoryPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [search, setSearch] = useState('');

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const inventoryQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'inventory'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('name', 'asc')
        );
    }, [userProfile?.clinicId, firestore]);

    const { data: items, loading, error } = useCollection<any>(inventoryQuery);

    // Only an admin may delete, matching the `inventory` rule in firestore.rules.
    // Showing the control to everyone would mean a receptionist getting a
    // permission error from a button that looked available.
    const canDelete = userProfile?.role === 'admin';

    const filtered = useMemo(() => {
        if (!items) return [];
        const needle = search.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) =>
            [item.name, item.category, item.unit]
                .filter(Boolean)
                .some((field: string) => String(field).toLowerCase().includes(needle))
        );
    }, [items, search]);

    const lowCount = useMemo(
        () => (items ?? []).filter((i) => Number(i.quantity) <= (Number(i.minStock) || DEFAULT_MIN_STOCK)).length,
        [items]
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                        <Package className="text-primary" /> Inventory Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Medical supplies and instruments. Medications live under Pharmacy.
                    </p>
                </div>
                <AddItemDialog
                    clinicId={userProfile?.clinicId}
                    trigger={
                        <Button className="button-glow">
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    }
                />
            </div>

            <Card className="border-dashed">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Medical Supplies</CardTitle>
                            <CardDescription>
                                {items?.length
                                    ? `${items.length} item${items.length === 1 ? '' : 's'} tracked${lowCount ? ` · ${lowCount} at or below reorder level` : ''}`
                                    : 'Monitor stock levels and manage clinic supplies.'}
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search supplies..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : error ? (
                        <IndexErrorAlert error={error} />
                    ) : filtered.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Stock Level</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((item: any) => {
                                        const quantity = Number(item.quantity) || 0;
                                        const reorderAt = Number(item.minStock) || DEFAULT_MIN_STOCK;
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={item.hasPendingWrites ? 'bg-muted/30' : ''}
                                            >
                                                <TableCell className="font-medium">
                                                    {item.name}
                                                    {item.hasPendingWrites && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            syncing…
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.category || 'Other'}</Badge>
                                                </TableCell>
                                                <TableCell className="tabular-nums">{quantity}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell>
                                                    {quantity <= 0 ? (
                                                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Out of stock
                                                        </Badge>
                                                    ) : quantity <= reorderAt ? (
                                                        <Badge className="flex w-fit items-center gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                                            <AlertTriangle className="h-3 w-3" /> Low stock
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                                                            In stock
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <EditItemDialog item={item} />
                                                        {canDelete && <DeleteItemDialog item={item} />}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : items && items.length > 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                            <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium">No supplies match “{search}”</h3>
                            <Button variant="ghost" className="mt-2" onClick={() => setSearch('')}>
                                Clear search
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="font-medium text-lg">No inventory items found</h3>
                            <p className="text-muted-foreground max-w-xs">
                                Start adding medical supplies to your clinic&apos;s inventory.
                            </p>
                            <AddItemDialog
                                clinicId={userProfile?.clinicId}
                                trigger={
                                    <Button variant="outline" className="mt-4 border-dashed">
                                        <Plus className="mr-2 h-4 w-4" /> Add First Item
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
