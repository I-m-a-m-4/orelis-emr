'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { BarChart3, LineChart, PieChart, TrendingUp, TrendingDown, DollarSign, Users, Activity, ExternalLink, Download, Filter, Package, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfile } from "@/lib/types";

export default function AnalyticsFinancePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState('30d');

    // Load user role
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-2xl tracking-tight">Analytics & Finance</h1>
                    <p className="text-muted-foreground text-sm">Comprehensive clinic performance, revenue metrics, and patient insights.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px] h-9 bg-background/50 backdrop-blur-sm border-dashed">
                            <SelectValue placeholder="Time Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-9 border-dashed" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-dashed backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all border-orange-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            No growth data yet
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-dashed backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Patients</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            No new patients this period
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-dashed backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clinical Encounters</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            No encounters recorded
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-dashed backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pharmacy Sales</CardTitle>
                        <Package className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            No sales data available
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="bg-background/50 border-dashed border w-full md:w-auto p-1 h-12 flex items-center justify-start gap-2">
                    <TabsTrigger value="revenue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Wallet className="w-4 h-4 mr-2" /> Revenue Stream
                    </TabsTrigger>
                    <TabsTrigger value="patients" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Users className="w-4 h-4 mr-2" /> Patient Growth
                    </TabsTrigger>
                    <TabsTrigger value="pharmacy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <CreditCard className="w-4 h-4 mr-2" /> Billings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg">Revenue Distribution</CardTitle>
                                <CardDescription>A breakdown of income across different clinic departments.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <div className="text-muted-foreground text-sm flex flex-col items-center gap-4">
                                    <PieChart className="h-20 w-20 opacity-20" />
                                    <p>No distribution data available yet</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg">Financial Performance Over Time</CardTitle>
                                <CardDescription>Monitoring month-over-month growth of the clinic.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <div className="text-muted-foreground text-sm flex flex-col items-center gap-4">
                                    <LineChart className="h-20 w-20 opacity-20" />
                                    <p>Loading historical data for {timeRange}...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-dashed overflow-hidden">
                        <CardHeader className="bg-muted/50">
                            <CardTitle>Recent Financial Transactions</CardTitle>
                            <CardDescription>Reviewing the latest invoices and payments processed.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-xs font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Transaction #</th>
                                            <th className="px-6 py-4">Patient / Client</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed">
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                                No recent transactions found
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="patients" className="mt-6 flex items-center justify-center py-20 bg-muted/20 border border-dashed rounded-lg">
                    <div className="text-center">
                        <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="font-medium">Patient Analytics</h3>
                        <p className="text-xs text-muted-foreground">Demographics and growth insights are currently being aggregated.</p>
                    </div>
                </TabsContent>

                <TabsContent value="pharmacy" className="mt-6 flex items-center justify-center py-20 bg-muted/20 border border-dashed rounded-lg">
                    <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="font-medium">Inventory & Billing</h3>
                        <p className="text-xs text-muted-foreground">Detailed pharmacy billing metrics will appear here.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
