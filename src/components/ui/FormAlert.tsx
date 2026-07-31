import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const toneStyles = {
  danger: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
} as const;

/**
 * What went wrong with a form, said in the page instead of in a browser bubble.
 *
 * `role="alert"` rather than a live region that is always mounted: the node
 * appears when there is something to say, which is exactly when a screen reader
 * should interrupt.
 */
export function FormAlert({
  tone = 'danger',
  title,
  children,
  className,
}: {
  tone?: keyof typeof toneStyles;
  title: ReactNode;
  /** Detail under the title — a list of what is missing, usually. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('space-y-1 rounded-xl border p-3 text-sm', toneStyles[tone], className)}
    >
      <p className={cn(children && 'font-medium')}>{title}</p>
      {children}
    </div>
  );
}
