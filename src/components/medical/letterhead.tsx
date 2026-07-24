
import React from 'react';
import { cn } from '@/lib/utils';
import { Hospital, Phone, Mail, MapPin } from 'lucide-react';

interface MedicalLetterheadProps {
    clinicName?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    className?: string;
}

export function MedicalLetterhead({
    clinicName = "ORELIS MEDICAL CENTRE",
    clinicAddress = "7, KEKE BUS STOP, OFF OLODO BANK IBADAN.",
    clinicPhone = "+234 9030821763, 08117847784",
    clinicEmail = "Safewaymedic@gmail.com",
    className
}: MedicalLetterheadProps) {
    return (
        <div className={cn("w-full border-b-2 border-primary/20 pb-6 mb-8 flex flex-col items-center text-center", className)}>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary mb-1 uppercase">
                {clinicName}
            </h1>
            <div className="flex flex-col items-center gap-1 text-[#0066CC] font-medium text-xs md:text-sm">
                <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{clinicAddress}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>Tel: {clinicPhone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>E-mail: {clinicEmail}</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-1 bg-primary/10 mt-4" />
        </div>
    );
}
