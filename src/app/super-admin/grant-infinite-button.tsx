
'use client';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { grantInfiniteAccessAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Crown } from 'lucide-react';

const initialState = { message: '', success: false };

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
    /**
     * `useActionState` calls the action as `(previousState, formData)`, but
     * `grantInfiniteAccessAction` takes `formData` alone. Passing it directly made
     * the previous state arrive where the form data was expected, so
     * `Object.fromEntries(formData.entries())` threw on every submission and the
     * grant never happened. The adapter drops the state argument and forwards the
     * form data.
     */
    const [state, formAction] = useActionState(
        (_prev: typeof initialState, formData: FormData) => grantInfiniteAccessAction(formData),
        initialState
    );
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            toast({
                // `success`, not `isSuccess` — the action returns `{ success, message }`.
                // Reading a property the action never sets made every outcome, including
                // a successful grant, render as a red error toast.
                title: state.success ? 'Success' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
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
