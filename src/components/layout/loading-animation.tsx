'use client';

import { useEffect, useState } from 'react';

export function LoadingAnimation() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="flex items-center justify-center h-screen w-full bg-background dark:bg-black" />;
    }

    return (
        <div className="flex items-center justify-center h-screen w-full overflow-hidden bg-background dark:bg-black">
            <div id="loadingWave" className="flex gap-4 [perspective:80px] [transform-style:preserve-3d]">
                <Square delay="0s" />
                <Triangle delay="0.1s" />
                <Diamond delay="0.2s" />
                <Circle delay="0.3s" />
                <Square delay="0.4s" />
                <Triangle delay="0.5s" />
                <Diamond delay="0.6s" />
                <Circle delay="0.7s" />
            </div>
        </div>
    );
}

function Square({ delay }: { delay: string }) {
    return (
        <div
            className="w-8 h-8 rounded-md bg-orange-500 animate-shape-wave shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            style={{ animationDelay: delay }}
        />
    );
}

function Triangle({ delay }: { delay: string }) {
    return (
        <div
            className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-orange-500 animate-triangle-wave drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            style={{ animationDelay: delay }}
        />
    );
}

function Diamond({ delay }: { delay: string }) {
    return (
        <div
            className="w-6 h-6 bg-orange-500 rotate-45 m-1 animate-shape-wave shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            style={{ animationDelay: delay }}
        />
    );
}

function Circle({ delay }: { delay: string }) {
    return (
        <div
            className="w-8 h-8 rounded-full bg-orange-500 animate-shape-wave shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            style={{ animationDelay: delay }}
        />
    );
}
