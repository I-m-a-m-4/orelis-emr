
'use client';

import React, { useEffect, useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaystackButtonProps {
  config: any;
  text?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (reference: any) => void;
  onClose?: () => void;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({
  config,
  text,
  className,
  disabled = false,
  onSuccess: externalOnSuccess,
  onClose: externalOnClose,
}) => {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkPaystack = () => {
      if ((window as any).PaystackPop || (window as any).paystack_loaded) {
        setIsLoaded(true);
      }
    };

    checkPaystack();
    const interval = setInterval(checkPaystack, 400);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!(window as any).PaystackPop && !(window as any).paystack_loaded) {
        setHasError(true);
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const initializePayment = usePaystackPayment(config);

  const handleSuccess = (reference: any) => {
    setIsProcessing(false);
    if (externalOnSuccess) {
      externalOnSuccess(reference);
    } else {
      toast({
        title: 'Payment Successful',
        description: `Payment complete! Reference: ${reference.reference}`,
      });
    }
  };

  const handleClose = () => {
    setIsProcessing(false);
    if (externalOnClose) {
      externalOnClose();
    } else {
      toast({
        title: 'Payment Closed',
        description: 'Payment dialog closed without completing transaction.',
        variant: 'destructive',
      });
    }
  };

  const handlePayment = () => {
    if (hasError) {
      toast({
        title: 'Payment Gateway Offline',
        description: 'The Paystack checkout script could not be loaded. Please check your network or ad blocker.',
        variant: 'destructive',
      });
      return;
    }

    if (!config.publicKey) {
      toast({
        title: 'Missing Gateway Key',
        description: 'Paystack public key is not configured in environment variables.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      initializePayment({
        onSuccess: handleSuccess,
        onClose: handleClose,
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: 'Gateway Error',
        description: error?.message || 'Unable to open Paystack checkout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const defaultText = `Pay with Paystack (₦${((config.amount || 0) / 100).toLocaleString()})`;

  return (
    <Button
      type="button"
      onClick={handlePayment}
      disabled={disabled || (!isLoaded && !hasError) || isProcessing}
      className={cn(
        'w-full h-12 rounded-xl text-base font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2',
        className
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : hasError ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive-foreground" />
          <span>Gateway Offline</span>
        </>
      ) : !isLoaded ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Paystack...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          <span>{text || defaultText}</span>
        </>
      )}
    </Button>
  );
};

export default PaystackButton;


