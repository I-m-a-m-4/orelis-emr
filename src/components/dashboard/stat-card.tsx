import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string;
    icon: ReactNode;
    description?: string;
    href?: string;
}

export function StatCard({ title, value, icon, description, href }: StatCardProps) {
    const cardContent = (
        <Card className={cn(
            "border-dashed transition-all duration-300",
            href && "hover:border-primary hover:shadow-md cursor-pointer group"
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href} className="block">{cardContent}</Link>;
    }

    return cardContent;
}
