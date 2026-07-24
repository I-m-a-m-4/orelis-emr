
import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin';
import admin from 'firebase-admin';

/**
 * PROVISIONING API: Example of how Orelis provides data to external partners
 * and tracks usage for monetization/profit.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');

        // 1. Authentication & Tier Identification
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key required' }, { status: 401 });
        }

        await initializeAdminApp();
        const db = admin.firestore();

        // 1. Authentication & Centralized Key Lookup (O(1) lookup)
        const keyDoc = await db.collection('api_keys').doc(apiKey).get();
        if (!keyDoc.exists) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
        }

        const config = keyDoc.data();
        if (!config || config.status === 'revoked') {
            return NextResponse.json({ error: 'API Key Revoked or Invalid' }, { status: 403 });
        }

        const clinicId = config.clinicId;
        const clinicDoc = await db.collection('clinics').doc(clinicId).get();
        if (!clinicDoc.exists) {
            return NextResponse.json({ error: 'Clinic not found for this key' }, { status: 404 });
        }
        const clinicData = clinicDoc.data() || {};

        // 2. Quota & Monetization Check
        if (config.quotaUsed >= config.quotaLimit) {
            return NextResponse.json({
                error: 'Quota Exceeded',
                message: 'Please upgrade your tier to continue using the data API.'
            }, { status: 429 });
        }

        // 3. Data Retrieval (e.g., anonymized analytics or authorized patient data)
        const dataType = searchParams.get('type') || 'stats';
        let responseData = {};

        if (dataType === 'stats') {
            const patientsCount = (await db.collection('patients').where('clinicId', '==', clinicDoc.id).count().get()).data().count;
            const encountersCount = (await db.collection('encounters').where('clinicId', '==', clinicDoc.id).count().get()).data().count;

            responseData = {
                clinicName: clinicData.name,
                stats: {
                    totalPatients: patientsCount,
                    totalEncounters: encountersCount,
                    generatedAt: new Date().toISOString()
                }
            };
        }

        // 4. Usage Tracking (THE PROFIT MECHANISM)
        const newUsage = admin.firestore.FieldValue.increment(1);

        await Promise.all([
            keyDoc.ref.update({ quotaUsed: newUsage }),
            clinicDoc.ref.update({ 'apiConfig.quotaUsed': newUsage })
        ]);

        return NextResponse.json({
            success: true,
            data: responseData,
            quotaRemaining: config.quotaLimit - (config.quotaUsed + 1)
        });

    } catch (error: any) {
        console.error('API Provider Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
