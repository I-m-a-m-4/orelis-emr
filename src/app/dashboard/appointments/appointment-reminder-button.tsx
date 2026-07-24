"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sendReminderAction } from '@/app/actions';
import { Send } from 'lucide-react';

interface AppointmentReminderButtonProps {
    appointment: {
        patientName: string;
        appointmentTime: string;
        doctorName: string;
    }
}

export function AppointmentReminderButton({ appointment }: AppointmentReminderButtonProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        const result = await sendReminderAction(appointment);
        if (result.success) {
            toast({
                title: "Reminder Generated",
                description: result.message,
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsLoading(false);
    };

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClick} 
            disabled={isLoading}
        >
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? 'Sending...' : 'Send Reminder'}
        </Button>
    );
}
