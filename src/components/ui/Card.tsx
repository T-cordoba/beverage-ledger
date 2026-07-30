import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-surface/60 p-4 shadow-panel backdrop-blur-md sm:p-6',
        className,
      )}
      {...props}
    />
  );
}
