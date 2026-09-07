'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { CreditCard, Receipt, ExternalLink, Zap, Shield, Building2, Crown, ShieldCheck, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaystackButton } from "@/components/paystack-button";
import { NewInvoiceDialog, DownloadInvoiceButton, ViewInvoiceDialog } from "@/components/billing/invoice-actions";
import type { Patient } from "@/lib/types";

const CYCLE_OPTIONS = [
    { label: '1 Month', months: 1, discount: 0 },
    { label: '3 Months', months: 3, discount: 0.05 },
    { label: '6 Months', months: 6, discount: 0.10 },
    { label: '1 Year', months: 12, discount: 0.15 },
];

const PLANS = [
    { id: 'starter', name: 'Starter', monthlyPrice: 15000, icon: Zap, color: 'text-sky-400', borderColor: 'border-sky-400/30', bgColor: 'bg-sky-500/5', desc: 'Solo practitioners' },
    { id: 'clinic', name: 'Clinic', monthlyPrice: 35000, icon: Shield, color: 'text-orange-400', borderColor: 'border-orange-400/50', bgColor: 'bg-orange-500/5', desc: 'Multi-doctor practices' },
    { id: 'hospital', name: 'Hospital', monthlyPrice: 75000, icon: Building2, color: 'text-violet-400', borderColor: 'border-violet-400/30', bgColor: 'bg-violet-500/5', desc: 'Full-service hospitals' },
    { id: 'enterprise', name: 'Enterprise', monthlyPrice: null, icon: Crown, color: 'text-amber-400', borderColor: 'border-amber-400/30', bgColor: 'bg-amber-500/5', desc: 'Custom needs' },
];

export default function BillingPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [cycleIdx, setCycleIdx] = useState(0);
    const cycle = CYCLE_OPTIONS[cycleIdx];
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    const clinicRef = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', userProfile.clinicId);
    }, [userProfile?.clinicId, firestore]);
    const { data: clinic } = useDoc<any>(clinicRef);
    const clinicName = clinic?.name ?? 'Orelis Clinic';
    
    // Read current plan (fallback to starter)
    const currentPlanId = clinic?.subscription?.plan ?? 'starter';
    const isInfinite = currentPlanId === 'infinite';

    const invoicesQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(collection(firestore, 'invoices'), where('clinicId', '==', userProfile.clinicId), orderBy('createdAt', 'desc'));
    }, [userProfile, firestore]);
    const { data: invoices, loading, error: queryError } = useCollection<any>(invoicesQuery);

    const patientsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
    }, [userProfile?.clinicId, firestore]);
    const { data: patients } = useCollection<Patient>(patientsQuery);

    const selectedPlan = PLANS.find(p => p.id === (selectedPlanId || currentPlanId));
    const payAmount = selectedPlan?.monthlyPrice 
        ? Math.round(selectedPlan.monthlyPrice * cycle.months * (1 - cycle.discount)) 
        : 0;

    const paystackConfig = {
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: user?.email || '',
        amount: payAmount * 100, // Paystack uses kobo
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

            {/* Plans Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* Cycle Toggle */}
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
                        {CYCLE_OPTIONS.map((opt, i) => (
                            <button
                                key={opt.label}
                                onClick={() => setCycleIdx(i)}
                                className={cn(
                                    'relative rounded-lg px-4 py-2 text-xs font-bold transition-all',
                                    cycleIdx === i ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {opt.label}
                                {opt.discount > 0 && <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-500">-{opt.discount * 100}%</span>}
                            </button>
                        ))}
                    </div>

                    {/* Plan Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {PLANS.map((plan) => {
                            const Icon = plan.icon;
                            const isCurrent = plan.id === currentPlanId;
                            const isSelected = plan.id === (selectedPlanId || currentPlanId);
                            const total = plan.monthlyPrice ? Math.round(plan.monthlyPrice * cycle.months * (1 - cycle.discount)) : null;

                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => !isCurrent && plan.monthlyPrice && setSelectedPlanId(plan.id)}
                                    className={cn(
                                        'relative flex flex-col rounded-xl border p-5 transition-all cursor-pointer overflow-hidden',
                                        isSelected ? 'ring-2 ring-primary shadow-lg border-primary/50' : 'hover:border-primary/30',
                                        isCurrent ? 'bg-muted/30 cursor-default' : plan.bgColor
                                    )}
                                >
                                    {isCurrent && (
                                        <div className="absolute top-3 right-3 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Active
                                        </div>
                                    )}
                                    <div className={cn('mb-3 w-fit rounded-lg border p-2', plan.borderColor, isCurrent ? 'bg-background' : plan.bgColor)}>
                                        <Icon className={cn('h-4 w-4', plan.color)} />
                                    </div>
                                    <h3 className="font-bold text-sm">{plan.name}</h3>
                                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{plan.desc}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-border/40">
                                        {plan.monthlyPrice ? (
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black">₦{total?.toLocaleString()}</span>
                                                <span className="text-[10px] text-muted-foreground">per {cycle.months === 1 ? 'month' : `${cycle.months} months`}</span>
                                            </div>
                                        ) : (
                                            <span className="text-lg font-black">Custom</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Checkout Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">Checkout</CardTitle>
                            <CardDescription className="text-xs">
                                {isInfinite ? 'You have a lifetime Infinite plan.' : 'Upgrade your practice.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b pb-4">
                                <span className="text-muted-foreground">Selected Plan</span>
                                <span className="font-bold">{selectedPlan?.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b pb-4">
                                <span className="text-muted-foreground">Billing Cycle</span>
                                <span className="font-bold">{cycle.label}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold">Total Due</span>
                                <span className="text-xl font-black text-primary">
                                    {payAmount ? `₦${payAmount.toLocaleString()}` : 'Contact Us'}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            {isInfinite ? (
                                <Button className="w-full" disabled variant="outline">Infinite Access Active</Button>
                            ) : payAmount > 0 && paystackConfig.publicKey ? (
                                <PaystackButton config={paystackConfig} />
                            ) : payAmount === 0 ? (
                                <Button className="w-full" asChild><a href="/contact">Contact Sales</a></Button>
                            ) : (
                                <Button className="w-full" disabled variant="secondary">Gateway Offline</Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                            </div>
                        ) : queryError ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-destructive/20 p-6">
                                <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
                                <h3 className="font-bold">Missing Database Index</h3>
                                <p className="text-sm max-w-md mt-2 mb-4">Firestore requires a composite index to sort invoices by date.</p>
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
                                <p className="text-muted-foreground max-w-xs">Your clinic's patient invoices and revenue data will appear here.</p>
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
