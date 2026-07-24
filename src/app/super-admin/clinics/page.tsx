
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/layout/loading-animation';

// This page exists to ensure the [id] dynamic route is correctly recognized by Next.js.
// It redirects users to the main super-admin dashboard if they land here directly.
export default function ClinicsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/super-admin');
    }, [router]);

    return <LoadingAnimation />;
}
