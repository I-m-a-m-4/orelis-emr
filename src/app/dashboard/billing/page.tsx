'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Clinic, SubscriptionHistory, UserProfile, Patient } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, History, ShieldCheck, Receipt, AlertTriangle, RefreshCw, Building2, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, safeToDate } from '@/lib/utils';
import TrialCountdown from '@/components/billing/trial-countdown';
import LifetimeAccessStatus from '@/components/billing/lifetime-status';
import { NewInvoiceDialog, DownloadInvoiceButton, ViewInvoiceDialog } from '@/components/billing/invoice-actions';
import { useSubscription } from '@/hooks/use-subscription';

const SubscriptionSection = dynamic(
  () => import('@/components/billing/subscription-section'),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <Card className="h-96">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
        <Card className="h-96">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    ),
  }
);

function BillingSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export default function BillingPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = React.useState('subscription');

  // User Profile
  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  // Clinic
  const clinicRef = React.useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return doc(firestore, 'clinics', userProfile.clinicId);
  }, [userProfile?.clinicId, firestore]);
  const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

  // Subscription Details Hook
  const { isLifetime, isReadOnly } = useSubscription();

  // Subscription History Query
  const subscriptionHistoryQuery = React.useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return query(
      collection(firestore, 'clinics', userProfile.clinicId, 'subscription_history'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [userProfile?.clinicId, firestore]);
  const {
    data: subscriptionHistory,
    loading: historyLoading,
  } = useCollection<SubscriptionHistory>(subscriptionHistoryQuery);

  // Invoices Query for patient billing tab
  const invoicesQuery = React.useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return query(
      collection(firestore, 'invoices'),
      where('clinicId', '==', userProfile.clinicId),
      orderBy('createdAt', 'desc')
    );
  }, [userProfile?.clinicId, firestore]);
  const { data: invoices, loading: invoicesLoading } = useCollection<any>(invoicesQuery);

  // Patients for New Invoice Dialog
  const patientsQuery = React.useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return query(collection(firestore, 'patients'), where('clinicId', '==', userProfile.clinicId));
  }, [userProfile?.clinicId, firestore]);
  const { data: patients } = useCollection<Patient>(patientsQuery);

  const isLoading = userLoading || profileLoading || clinicLoading;

  if (isLoading) {
    return <BillingSkeleton />;
  }

  if (!clinic || !userProfile) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-2xl max-w-lg mx-auto my-12">
        <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="font-bold text-lg">Clinic Workspace Not Initialized</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Please complete your clinic setup to view subscription plans and patient billing history.
        </p>
        <Button asChild>
          <a href="/onboarding">Complete Setup</a>
        </Button>
      </div>
    );
  }

  const clinicName = clinic.name || 'Orelis Clinic';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-xl md:text-3xl flex items-center gap-2.5 tracking-tight">
            <CreditCard className="text-primary h-7 w-7" />
            Billing & Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your clinic's subscription plans, 30-day Pro trial, and patient clinical invoicing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'invoices' && (
            <NewInvoiceDialog clinicId={userProfile.clinicId} patients={patients} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Read-Only Mode Notice on Billing Page */}
      {isReadOnly && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-6 w-6 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">30-Day Pro Trial Expired: Read-Only Mode Active</p>
            <p className="text-xs opacity-90 mt-0.5">
              Your complimentary trial has ended. Clinical recording, charting, and patient registrations are locked to read-only until you activate a paid plan.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-80 grid-cols-2 rounded-xl h-11 bg-muted/70 p-1">
          <TabsTrigger value="subscription" className="rounded-lg text-xs font-bold gap-2">
            <ShieldCheck className="h-4 w-4" /> Subscription
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-lg text-xs font-bold gap-2">
            <Receipt className="h-4 w-4" /> Patient Invoices
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SUBSCRIPTION & PLANS */}
        <TabsContent value="subscription" className="space-y-6 mt-6">
          {/* Status Card: Lifetime or 30-Day Trial Countdown */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Current Access & License Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLifetime ? (
                <LifetimeAccessStatus />
              ) : (
                <TrialCountdown clinic={clinic} />
              )}
            </CardContent>
          </Card>

          {/* Dynamic Subscription Plans Section */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Subscription Plans & Pricing
              </CardTitle>
              <CardDescription>
                Every clinic receives a complimentary 30-day trial on the Pro plan. Choose a subscription to keep full operational and charting access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionSection userProfile={userProfile} clinic={clinic} />
            </CardContent>
          </Card>

          {/* Subscription History Table */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
                <History className="h-5 w-5 text-primary" />
                Subscription History
              </CardTitle>
              <CardDescription>
                Audit log of all trial activations, renewals, and Paystack transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Transaction / Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Skeleton className="h-6 w-1/2 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : subscriptionHistory && subscriptionHistory.length > 0 ? (
                      subscriptionHistory.map((item) => (
                        <TableRow key={item.id || item.timestamp}>
                          <TableCell className="font-semibold text-sm">
                            {item.action}
                            {item.reference && (
                              <span className="block text-[11px] text-muted-foreground font-mono">
                                Ref: {item.reference}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-sm">
                            {item.amount === 0
                              ? 'Free (Trial)'
                              : `${item.currency === 'USD' ? '$' : '₦'}${item.amount.toLocaleString()}`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-bold px-2 py-0.5',
                                item.status === 'success'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                              )}
                            >
                              {item.status || 'success'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {item.timestamp ? format(safeToDate(item.timestamp), 'PPp') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium">No subscription transactions found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            New trial activations and Paystack payments will automatically appear here.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PATIENT INVOICES */}
        <TabsContent value="invoices" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Patient Invoices</CardTitle>
                <CardDescription>Clinical billing, consultations, medications, and lab charges.</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
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
                            <TableCell className="font-mono text-xs font-bold">{inv.invoiceNumber}</TableCell>
                            <TableCell className="font-medium">{inv.patientName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {inv.createdAt ? format(safeToDate(inv.createdAt), 'PP') : 'N/A'}
                            </TableCell>
                            <TableCell className="font-bold">₦{inv.amount?.toLocaleString() || '0'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={inv.status === 'paid' ? 'default' : 'outline'}
                                className={
                                  inv.status === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : ''
                                }
                              >
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
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-xl">
                    <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <h3 className="font-bold text-base">No Patient Invoices</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Patient invoices generated during consultations or pharmacy checkouts will be cataloged here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">Total Invoices</span>
                    <span className="font-bold">{invoices?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">Paid Total</span>
                    <span className="font-bold text-emerald-600">
                      ₦
                      {(
                        invoices
                          ?.filter((inv: any) => inv.status === 'paid')
                          .reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0) || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Pending Balance</span>
                    <span className="font-bold text-amber-600">
                      ₦
                      {(
                        invoices
                          ?.filter((inv: any) => inv.status !== 'paid')
                          .reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0) || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Invoicing Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>Invoices are automatically linked to patient medical codes and can be downloaded as PDF receipts or shared directly.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
