
'use client';
import React, { useEffect, useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, AlertCircle } from 'lucide-react';

interface PaystackButtonProps {
    config: any;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({ config }) => {
    const { toast } = useToast();
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Ensure we are on the client and script is available
    useEffect(() => {
        const checkPaystack = () => {
            if ((window as any).PaystackPop) {
                setIsLoaded(true);
            } else if ((window as any).paystack_loaded) { // Some versions use this
                setIsLoaded(true);
            }
        };

        checkPaystack();
        const interval = setInterval(checkPaystack, 500);
        const timeout = setTimeout(() => {
            clearInterval(interval);
            if (!(window as any).PaystackPop) {
                setHasError(true);
            }
        }, 5000); // 5 seconds timeout

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const initializePayment = usePaystackPayment(config);

    const onSuccess = (reference: any) => {
        toast({
            title: "Payment Successful",
            description: `Payment complete! Your reference is ${reference.reference}`,
        });
    };

    const onClose = () => {
        toast({
            title: "Payment Closed",
            description: "You closed the payment modal.",
            variant: "destructive"
        });
    };

    const handlePayment = () => {
        if (hasError) {
            toast({
                title: "Payment Loading Error",
                description: "The Paystack payment script could not be loaded. Please check your internet connection or disable ad-blockers.",
                variant: "destructive"
            });
            return;
        }

        try {
            initializePayment({ onSuccess, onClose });
        } catch (error) {
            toast({
                title: "Gateway Error",
                description: "Unable to open Paystack. Please try again or refresh the page.",
                variant: "destructive"
            });
        }
    };

    return (
        <Button
            onClick={handlePayment}
            disabled={!isLoaded && !hasError}
            className="w-full h-14 rounded-xl text-lg font-black transition-all cursor-pointer shadow-lg shadow-primary/20 button-glow"
        >
            {hasError ? (
                <><AlertCircle className="mr-2 h-5 w-5" /> Provider Error</>
            ) : !isLoaded ? (
                <CreditCard className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
                <><CreditCard className="mr-2 h-4 w-4" /> Go Premium (₦2,000)</>
            )}
        </Button>
    );
};

