
'use client';

import { cn } from "@/lib/utils";

interface DashLoaderProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function DashLoader({ className, size = 'md' }: DashLoaderProps) {
    const dimensions = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-10 h-10'
    };

    const dashWidth = {
        sm: 'w-3 h-[1px]',
        md: 'w-4 h-[1.2px]',
        lg: 'w-6 h-[2px]'
    };

    const origin = {
        sm: '8px 0.5px',
        md: '12px 0.6px',
        lg: '20px 1px'
    };

    const top = {
        sm: '7.5px',
        md: '11.4px',
        lg: '19px'
    };

    const translate = {
        sm: '4px',
        md: '7px',
        lg: '12px'
    };

    return (
        <div className={cn("flex items-center justify-center pointer-events-none", className)}>
            <div className={cn("relative", dimensions[size])} style={{ transform: 'scale(1.2)' }}>
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className={cn("absolute bg-current rounded-full opacity-20", dashWidth[size])}
                        style={{
                            left: 0,
                            top: top[size],
                            transformOrigin: origin[size],
                            transform: `rotate(${i * 45}deg) translateX(${translate[size]})`,
                            animation: `dashSpin 0.8s linear infinite`,
                            animationDelay: `${i * 0.1}s`
                        }}
                    />
                ))}
            </div>
            <style jsx global>{`
                @keyframes dashSpin {
                    0% { opacity: 1; }
                    100% { opacity: 0.2; }
                }
            `}</style>
        </div>
    );
}
