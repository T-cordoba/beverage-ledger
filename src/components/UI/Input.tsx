import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  /** Icon or button pinned to the right edge, inside the field. */
  trailing?: ReactNode;
}

export function Input({ className, trailing, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        'w-full rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-foreground',
        'placeholder:text-placeholder',
        'transition-colors focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        trailing && 'pr-12',
        className,
      )}
      {...props}
    />
  );

  if (!trailing) return input;

  return (
    <div className="relative">
      {input}
      <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center">
        {trailing}
      </span>
    </div>
  );
}
