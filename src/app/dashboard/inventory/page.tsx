'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Package, Plus, Search, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    const inventoryQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'inventory'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('name', 'asc')
        );
    }, [userProfile, firestore]);

    const { data: items, loading } = useCollection<any>(inventoryQuery);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                    <Package className="text-primary" /> Inventory Management
                </h1>
                <Button className="button-glow">
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>

            <Card className="border-dashed">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Medical Supplies & Drugs</CardTitle>
                            <CardDescription>Monitor stock levels and manage clinic inventory.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search inventory..."
                                className="pl-8"
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
                    ) : items && items.length > 0 ? (
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
                                    {items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell>
                                                {item.quantity <= (item.minStock || 5) ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Low Stock
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">In Stock</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="font-medium text-lg">No inventory items found</h3>
                            <p className="text-muted-foreground max-w-xs">Start adding medical supplies or pharmaceuticals to your clinic's inventory.</p>
                            <Button variant="outline" className="mt-4 border-dashed">
                                <Plus className="mr-2 h-4 w-4" /> Add First Item
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
