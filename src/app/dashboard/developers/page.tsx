
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, updateDoc, setDoc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { UserProfile, Clinic } from "@/lib/types";
import { LoadingAnimation } from "@/components/layout/loading-animation";
import { Code, Copy, Key, ShieldCheck, Terminal, BarChart3, Zap, Globe, Lock, History, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrelisLogo } from "@/components/layout/orelis-logo";

export default function DeveloperPage() {
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [generating, setGenerating] = useState(false);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const clinicRef = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return doc(firestore, 'clinics', userProfile.clinicId);
    }, [userProfile, firestore]);
    const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

    // Fetch recent key generation logs for this clinic
    const logsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'api_keys'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [userProfile?.clinicId, firestore]);
    const { data: keyLogs, loading: logsLoading } = useCollection<any>(logsQuery);

    const generateApiKey = async () => {
        if (!clinicRef || !userProfileRef || !userProfile || !firestore) return;
        setGenerating(true);
        try {
            const newKey = `pk_live_${crypto.randomUUID().replace(/-/g, '')}`;
            const timestamp = new Date().toISOString();

            const config = {
                apiKey: newKey,
                quotaLimit: 1000,
                quotaUsed: 0,
                tier: 'Free' as const,
                lastGenerated: timestamp,
                generatedBy: userProfile.name,
                generatedById: userProfile.uid,
                clinicId: userProfile.clinicId
            };

            // 1. Update centralized api_keys index (for O(1) server lookup)
            await setDoc(doc(firestore, 'api_keys', newKey), {
                ...config,
                createdAt: timestamp,
                status: 'active'
            });

            // 2. Update Clinic-wide config
            await updateDoc(clinicRef, {
                apiConfig: config
            });

            // 3. Update individual User profile for tracking
            await updateDoc(userProfileRef, {
                apiConfig: config
            });

            toast({
                title: "Success",
                description: "New API Key generated successfully and distributed across all layers!",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to generate API Key. Ensure you have stable internet.",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied",
            description: "Copied to clipboard!",
        });
    };

    if (userLoading || profileLoading || clinicLoading) return <LoadingAnimation />;

    const apiConfig = clinic?.apiConfig;

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto py-8 font-dm-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Developer Console</h1>
                    <p className="text-muted-foreground mt-1">Manage your API keys and monitor integration usage.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-none px-3 py-1 border-dashed">
                        Status: <span className="text-green-500 ml-1 font-bold">Active</span>
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* API Key Management */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-dashed rounded-none transition-all hover:border-primary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5 text-primary" />
                                Production API Key
                            </CardTitle>
                            <CardDescription>
                                Securely stored and tracked per user. Only admins can roll keys.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {apiConfig?.apiKey ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            readOnly
                                            value={apiConfig.apiKey}
                                            className="font-mono bg-muted/30 border-dashed rounded-none pr-10"
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute right-0 top-0 h-full rounded-none hover:bg-primary/10"
                                            onClick={() => copyToClipboard(apiConfig.apiKey)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="rounded-none border-dashed"
                                        onClick={generateApiKey}
                                        disabled={generating || userProfile?.role === 'receptionist'}
                                    >
                                        {userProfile?.role === 'receptionist' ? 'Admin Only' : 'Roll Key'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-muted bg-muted/5">
                                    <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                    <p className="text-sm text-center text-muted-foreground mb-4">You haven't generated an API key yet.</p>
                                    <Button
                                        onClick={generateApiKey}
                                        className="rounded-none px-8"
                                        disabled={generating || userProfile?.role === 'receptionist'}
                                    >
                                        {userProfile?.role === 'receptionist' ? 'Unauthorized' : 'Generate API Key'}
                                    </Button>
                                </div>
                            )}

                            {apiConfig && (
                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                                    {(apiConfig as any).generatedBy && (
                                        <p>Global Key Owner: <span className="text-primary font-bold">{(apiConfig as any).generatedBy}</span></p>
                                    )}
                                    {(apiConfig as any).lastGenerated && (
                                        <p>Active Since: <span className="font-mono">{new Date((apiConfig as any).lastGenerated).toLocaleDateString()}</span></p>
                                    )}
                                </div>
                            )}

                            {apiConfig && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                    <div className="p-4 border border-dashed rounded-none bg-muted/20">
                                        <p className="text-xs uppercase text-muted-foreground font-bold">Tier</p>
                                        <p className="text-xl font-bold text-primary">{apiConfig.tier}</p>
                                    </div>
                                    <div className="p-4 border border-dashed rounded-none bg-muted/20">
                                        <p className="text-xs uppercase text-muted-foreground font-bold">Limit</p>
                                        <p className="text-xl font-bold">{apiConfig.quotaLimit.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 border border-dashed rounded-none bg-muted/20">
                                        <p className="text-xs uppercase text-muted-foreground font-bold">Used</p>
                                        <p className="text-xl font-bold">{apiConfig.quotaUsed.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 border border-dashed rounded-none bg-muted/20">
                                        <p className="text-xs uppercase text-muted-foreground font-bold">Remaining</p>
                                        <p className="text-xl font-bold text-green-600">{(apiConfig.quotaLimit - apiConfig.quotaUsed).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Key History */}
                    <Card className="border-dashed rounded-none border-t-0 md:border-t">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <History className="w-4 h-4 text-muted-foreground" />
                                Audit Log: Recent Generations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            <div className="divide-y divide-dashed border-t border-dashed">
                                {keyLogs && keyLogs.length > 0 ? keyLogs.map((log: any) => (
                                    <div key={log.apiKey} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                                <User className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{log.generatedBy}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{log.apiKey.substring(0, 12)}...</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-mono">{new Date(log.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{log.tier} Tier</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="px-6 py-8 text-center text-muted-foreground text-sm italic">
                                        No recent key generation activity found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Integration Health */}
                <Card className="border-dashed rounded-none transition-all hover:border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Integration Guide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-xs font-bold text-primary">1</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-bold">Register Clinic ID</p>
                                <p className="text-muted-foreground">Ensure your external app uses clinic: <code className="text-primary font-bold">{userProfile?.clinicId || '...'}</code></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-xs font-bold text-primary">2</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-bold">Set Authorization</p>
                                <p className="text-muted-foreground">Always pass your API key as a Bearer token in the request header.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-xs font-bold text-primary">3</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-bold">Monitor Quotas</p>
                                <p className="text-muted-foreground">Check the response headers or this dashboard to prevent service interruption.</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button variant="secondary" className="w-full rounded-none" asChild>
                            <a href="/dashboard/support">Full API Reference</a>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Quick Documentation Snippet */}
            <Card className="border-dashed rounded-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-primary" />
                        Quick Start Implementation
                    </CardTitle>
                    <CardDescription>Copy-paste this snippet to start fetching data from the Orelis Provisioning API.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative group">
                        <pre className="p-6 bg-zinc-950 text-emerald-400 font-mono text-sm overflow-x-auto rounded-none border border-white/10 select-all">
                            {`curl -X GET "https://orelis.app/api/v1/data?type=stats" \\
     -H "Authorization: Bearer ${apiConfig?.apiKey || '<YOUR_API_KEY>'}" \\
     -H "Content-Type: application/json"`}
                        </pre>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-white/50 hover:text-white"
                            onClick={() => copyToClipboard(`curl -X GET "https://orelis.app/api/v1/data?type=stats" -H "Authorization: Bearer ${apiConfig?.apiKey || 'YOUR_API_KEY'}"`)}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Docs (Markdown View) */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-dashed pb-2">
                    <Code className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-primary/80">Full Platform Documentation</h2>
                </div>

                <div className="grid gap-8 p-8 md:p-12 border border-dashed bg-card/50">
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            1. Executive Summary
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Orelis has transitioned from a standalone Electronic Medical Record (EMR) into a **Platform-as-a-Service (PaaS)**. Our API enables two-way communication through dedicated Consuming and Provisioning layers.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            2. Authentication
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-6 bg-muted/30 border border-dashed rounded-none">
                                <p className="font-bold text-primary mb-2">Integration Bridge</p>
                                <p className="text-sm text-muted-foreground">Requires <code className="bg-primary/10 px-2 py-0.5 font-bold">x-orelis-key</code> in headers. Used for secure server-to-server synchronization.</p>
                            </div>
                            <div className="p-6 bg-muted/30 border border-dashed rounded-none">
                                <p className="font-bold text-primary mb-2">Standard Provider API</p>
                                <p className="text-sm text-muted-foreground">Requires <code className="bg-primary/10 px-2 py-0.5 font-bold">Bearer Token</code>. Used for fetching metrics and clinic metadata.</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            3. Monetization & Usage
                        </h3>
                        <p className="text-muted-foreground">
                            Every request contributes to your monthly usage quota. Higher subscription tiers unlock increased limits and detailed analytics. You can track your real-time usage in the **Key Management** card above.
                        </p>
                    </section>
                </div>
            </div>

            <div className="flex justify-center pt-8 border-t border-dashed">
                <OrelisLogo className="opacity-30 grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
        </div>
    );
}
