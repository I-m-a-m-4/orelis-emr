import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const adminApp = await initializeAdminApp();
        const auth = getAuth(adminApp);
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const { clinicId, patientCode } = await req.json();
        if (!clinicId || !patientCode) {
            return NextResponse.json({ error: 'Missing clinicId or patientCode' }, { status: 400 });
        }

        const firestore = getFirestore(adminApp);
        
        // Find patient
        const patientsSnapshot = await firestore.collection('patients')
            .where('clinicId', '==', clinicId)
            .where('patientCode', '==', patientCode.toUpperCase())
            .limit(1)
            .get();

        if (patientsSnapshot.empty) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        const patientDoc = patientsSnapshot.docs[0];

        // Update user
        await firestore.collection('users').doc(uid).update({
            patientId: patientDoc.id
        });

        return NextResponse.json({ success: true, patientId: patientDoc.id });
    } catch (error: any) {
        console.error('Error linking patient:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
