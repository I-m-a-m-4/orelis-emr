
'use client';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { grantInfiniteAccessAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Crown } from 'lucide-react';

const initialState = { message: '', isSuccess: false };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button variant="outline" size="sm" type="submit" disabled={pending}>
            <Crown className="mr-2 h-4 w-4" />
            {pending ? 'Granting...' : 'Grant Infinite Access'}
        </Button>
    )
}

export function GrantInfiniteButton({ clinicId }: { clinicId: string }) {
    const [state, formAction] = useActionState(grantInfiniteAccessAction, initialState);
    const { toast } = useToast();
    
    useEffect(() => {
        if (state.message) {
            toast({
                title: state.isSuccess ? 'Success' : 'Error',
                description: state.message,
                variant: state.isSuccess ? 'default' : 'destructive',
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction}>
            <input type="hidden" name="clinicId" value={clinicId} />
            <SubmitButton />
        </form>
    );
}
