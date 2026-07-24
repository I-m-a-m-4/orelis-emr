'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from 'lucide-react';

interface ThemedPlaceholderProps {
    title: string;
    description: string;
    icon: LucideIcon;
    colorClass?: string;
}

export function ThemedPlaceholder({ title, description, icon: Icon, colorClass = "text-primary" }: ThemedPlaceholderProps) {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                <Icon className={colorClass} /> {title}
            </h1>

            <Card className="border-dashed py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className={`p-4 rounded-full bg-primary/10 mb-4`}>
                        <Icon className={`h-12 w-12 ${colorClass}`} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{title} Module</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        {description}
                    </p>
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                        Coming Soon to Orelis Engine
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
