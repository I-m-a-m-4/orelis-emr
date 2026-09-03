'use client';

import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DashLoaderProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function DashLoader({ className, size = 'md' }: DashLoaderProps) {
    const sizeMap = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-10 w-10'
    };

    return (
        <Loader2 className={cn("animate-spin shrink-0", sizeMap[size], className)} />
    );
}
