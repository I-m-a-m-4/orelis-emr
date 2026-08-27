"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateAppointmentReminder } from '@/lib/ai-client';
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
        const result = await generateAppointmentReminder({
            patientName: appointment.patientName,
            // The prompt asks for a human-readable time, not an ISO string, and
            // is instructed to omit the time zone — so the formatting happens
            // here rather than in the flow.
            appointmentTime: new Date(appointment.appointmentTime).toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }),
            doctorName: appointment.doctorName,
        });

        if (result.ok) {
            toast({
                title: "Reminder Generated",
                description: `Reminder preview: "${result.data?.reminderMessage ?? ''}"`,
            });
        } else {
            toast({
                title: result.offline ? "No connection" : "Error",
                description: result.error,
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
