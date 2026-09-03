import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/**
 * Status tone for a metric.
 *
 * Deliberately a small closed set rather than a free colour prop. These are
 * *status* colours — reserved for state, never handed out to make a tile look
 * different — and every one of them renders alongside an icon and a text label,
 * so the state is never carried by colour alone.
 */
export type StatTone = 'neutral' | 'good' | 'warning' | 'critical';

const TONE_ICON: Record<StatTone, string> = {
    neutral: 'text-primary',
    good: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-destructive',
};

const TONE_VALUE: Record<StatTone, string> = {
    neutral: 'text-foreground',
    good: 'text-foreground',
    // Only the genuinely actionable tones tint the number itself.
    warning: 'text-amber-500',
    critical: 'text-destructive',
};

export interface StatTrend {
    /** Percent change against the preceding window of equal length. */
    value: number;
    /** What the comparison is against, e.g. "vs previous 30d". */
    label?: string;
    /** Set when a *rise* is the bad outcome (cancellations, outstanding debt). */
    inverted?: boolean;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: ReactNode;
    description?: string;
    href?: string;
    tone?: StatTone;
    trend?: StatTrend;
    /**
     * 0–100. Renders a meter beneath the value, for metrics that are a share of
     * a whole (a rate, an occupancy). Omit for counts — a meter on an unbounded
     * count implies a ceiling that does not exist.
     */
    meter?: number;
    /** Spelled-out derivation, shown on hover, so a rate is never a mystery. */
    formula?: string;
}

function TrendBadge({ trend }: { trend: StatTrend }) {
    const flat = Math.abs(trend.value) < 0.5;
    // Direction is the non-colour signal: the arrow says which way it moved even
    // where the hue does not survive (CVD, forced colours, print).
    const Icon = flat ? Minus : trend.value > 0 ? ArrowUpRight : ArrowDownRight;
    const improving = trend.inverted ? trend.value < 0 : trend.value > 0;
    const tint = flat
        ? 'text-muted-foreground'
        : improving
            ? 'text-emerald-500'
            : 'text-destructive';

    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Icon className={cn('h-3 w-3', tint)} aria-hidden />
            <span className={tint}>
                {flat ? 'No change' : `${trend.value > 0 ? '+' : ''}${trend.value.toFixed(1)}%`}
            </span>
            {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
        </span>
    );
}

export function StatCard({
    title,
    value,
    icon,
    description,
    href,
    tone = 'neutral',
    trend,
    meter,
    formula,
}: StatCardProps) {
    const clamped =
        typeof meter === 'number' ? Math.max(0, Math.min(100, meter)) : undefined;

    const cardContent = (
        <Card
            className={cn(
                "border-dashed transition-all duration-300 h-full",
                href && "hover:border-primary hover:shadow-md cursor-pointer group"
            )}
            title={formula}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
                    {title}
                </CardTitle>
                <span className={TONE_ICON[tone]}>{icon}</span>
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold tabular-nums", TONE_VALUE[tone])}>{value}</div>

                {clamped !== undefined && (
                    <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${clamped.toFixed(0)} percent`}
                    >
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-500',
                                tone === 'critical'
                                    ? 'bg-destructive'
                                    : tone === 'warning'
                                        ? 'bg-amber-500'
                                        : tone === 'good'
                                            ? 'bg-emerald-500'
                                            : 'bg-primary'
                            )}
                            style={{ width: `${clamped}%` }}
                        />
                    </div>
                )}

                {trend && <div className="mt-2"><TrendBadge trend={trend} /></div>}
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href} className="block h-full">{cardContent}</Link>;
    }

    return cardContent;
}
