'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { CreditCard, Plus, Receipt, Download, FileText, CheckCircle2, Zap, ShieldCheck, Crown, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';
import { useToast } from "@/hooks/use-toast";

import { PaystackButton } from "@/components/paystack-button";
import {
    NewInvoiceDialog, DownloadInvoiceButton, ViewInvoiceDialog,
} from "@/components/billing/invoice-actions";
import type { Patient } from "@/lib/types";


export default function BillingPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    const invoicesQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        // NOTE: This query requires an index: clinicId (ASC) + createdAt (DESC)
        return query(
            collection(firestore, 'invoices'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('createdAt', 'desc')
        );
    }, [userProfile, firestore]);

    const { data: invoices, loading, error: queryError } = useCollection<any>(invoicesQuery);

    // Needed to raise an invoice against a named patient. Equality-only, so no
    // composite index is involved.
    const patientsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [userProfile?.clinicId, firestore]);
    const { data: patients } = useCollection<Patient>(patientsQuery);

    // The clinic's own name heads the generated PDF.
    const clinicRef = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', userProfile.clinicId);
    }, [userProfile?.clinicId, firestore]);
    const { data: clinic } = useDoc<any>(clinicRef);
    const clinicName = clinic?.name ?? 'Orelis Clinic';

    const paystackConfig = {
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: user?.email || '',
        amount: 200000,
        reference: new Date().getTime().toString(),
    };


    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                        <CreditCard className="text-primary" /> Billing & Subscriptions
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage your clinic's subscription plans and patient invoices.</p>
                </div>
                <NewInvoiceDialog clinicId={userProfile?.clinicId} patients={patients} />
            </div>

            {/* Plans Section - Simplified to Flat Rate */}
            <div className="max-w-xl mx-auto w-full">
                <Card className="relative flex flex-col border-dashed border-primary shadow-2xl ring-2 ring-primary/10 overflow-hidden bg-primary/5">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Crown className="w-24 h-24 text-primary rotate-12" />
                    </div>
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/20 p-3 rounded-full mb-4">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Full Clinic Access</CardTitle>
                        <CardDescription className="text-md">One simple price for every feature Orelis offers.</CardDescription>
                        <div className="flex items-baseline justify-center gap-1 mt-6">
                            <span className="text-5xl font-black text-primary">₦2,000</span>
                            <span className="text-muted-foreground font-bold">/month</span>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm font-medium text-muted-foreground px-6 leading-relaxed">
                            No hidden tiers. No locked features. Your subscription covers unlimited patient records, full clinical SOAP encounters, pharmacy, lab, and all future updates.
                        </p>
                    </CardContent>
                    <CardFooter className="pb-8">
                        {paystackConfig.publicKey ? (
                            <PaystackButton config={paystackConfig} />
                        ) : (
                            <Button className="w-full h-14 rounded-xl text-lg font-black" variant="secondary" disabled>
                                Payment Gateway Offline
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Recent Patient Invoices</CardTitle>
                        <CardDescription>Overview of recent clinical billing operations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : queryError ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-destructive/20 p-6">
                                <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
                                <h3 className="font-bold">Missing Database Index</h3>
                                <p className="text-sm max-w-md mt-2 mb-4">
                                    Firestore requires a composite index to sort invoices by date. Please ask your administrator to click the activation link in their console.
                                </p>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://console.firebase.google.com/v1/r/project/orelis-med/firestore/indexes?create_composite=Cktwcm9qZWN0cy9vcmVsaXMtbWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9pbnZvaWNlcy9pbmRleGVzL18QARoMCghjbGluaWNJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI" target="_blank">
                                        Activate Index <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            </div>
                        ) : invoices && invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((inv: any) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                                                <TableCell className="font-medium">{inv.patientName}</TableCell>
                                                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>₦{inv.amount?.toLocaleString() || '0'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className={inv.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <DownloadInvoiceButton invoice={inv} clinicName={clinicName} />
                                                        <ViewInvoiceDialog invoice={inv} clinicName={clinicName} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                                <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="font-medium text-lg">No billing history yet</h3>
                                <p className="text-muted-foreground max-w-xs">Your clinic's patient invoices and revenue data will appear here once generated.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-dashed bg-green-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Revenue Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Collected Today</span>
                                <span className="font-bold">₦0.00</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Pending Payments</span>
                                <span className="font-bold">₦0.00</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Help Center</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                            Need help with insurance claims or complex billing? Check our documentation.
                            <Button variant="link" className="p-0 h-auto text-xs mt-2 text-primary" asChild>
                                <a href="/dashboard/help">Visit Help Center</a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
