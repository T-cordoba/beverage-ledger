import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, rows = 3, ...props }: ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full resize-y rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-foreground',
        'placeholder:text-placeholder',
        'transition-colors focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
