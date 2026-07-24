
import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin';
import admin from 'firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-orelis-key');
        const sharedSecret = process.env.ORELIS_INTEGRATION_KEY || 'orelis_default_secret_2024';

        if (authHeader !== sharedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            clinicId,
            patientEmail,
            patientName,
            productName,
            amount,
            category,
            timestamp
        } = body;

        if (!clinicId || !patientEmail) {
            return NextResponse.json({ error: 'Missing clinicId or patientEmail' }, { status: 400 });
        }

        await initializeAdminApp();
        const db = admin.firestore();

        // 1. Find the patient in this clinic
        const patientsRef = db.collection('patients');
        const patientQuery = await patientsRef
            .where('clinicId', '==', clinicId)
            .where('email', '==', patientEmail)
            .limit(1)
            .get();

        let patientId = '';
        let finalPatientName = patientName;

        if (patientQuery.empty) {
            // Potentially create a placeholder patient or just return error
            // For this implementation, we'll return error if patient not found to ensure data integrity
            return NextResponse.json({ error: 'Patient not found in this clinic' }, { status: 404 });
        } else {
            const patientDoc = patientQuery.docs[0];
            patientId = patientDoc.id;
            finalPatientName = `${patientDoc.data().firstName} ${patientDoc.data().surname}`;
        }

        // 2. Conflict Resolution logic (for medical data if we were updating it)
        // For purchases, we just add to the history.

        // 3. Add to Purchases collection (Shelf History)
        const purchasesRef = db.collection('purchases');
        const purchaseData = {
            clinicId,
            patientId,
            patientName: finalPatientName,
            productName,
            amount: Number(amount) || 0,
            category: category || 'Retail',
            date: timestamp || new Date().toISOString(),
            source: 'Orelis-Integrated',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await purchasesRef.add(purchaseData);

        // 4. Update patient's last activity
        await patientsRef.doc(patientId).update({
            lastVisit: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            purchaseId: docRef.id,
            message: 'Integration successful: Shelf history updated.'
        });

    } catch (error: any) {
        console.error('Integration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
