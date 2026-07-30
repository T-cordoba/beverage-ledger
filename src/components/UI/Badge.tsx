import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

const toneStyles = {
  neutral: 'bg-contrast/10 text-contrast/80 border-contrast/20',
  accent: 'bg-accent/10 text-accent/80 border-accent/20',
  info: 'bg-info/10 text-info/80 border-info/20',
  success: 'bg-success/10 text-success/80 border-success/20',
  warning: 'bg-warning/10 text-warning/80 border-warning/20',
  danger: 'bg-danger/10 text-danger/80 border-danger/20',
} as const;

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: keyof typeof toneStyles;
  /** Pill shape with uppercase tracking, for the primary label of an item. */
  emphasis?: boolean;
}

export function Badge({ tone = 'neutral', emphasis = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border text-xs font-medium',
        emphasis ? 'rounded-full px-4 py-2 uppercase tracking-widest' : 'rounded-md px-2 py-1',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
