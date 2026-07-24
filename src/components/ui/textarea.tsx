
import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-none border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm animated-input-focus',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

