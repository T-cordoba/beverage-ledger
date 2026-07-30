import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

const toneStyles = {
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** One line under the number: the unit, the range, whatever qualifies it. */
  hint?: ReactNode;
  tone?: keyof typeof toneStyles;
  className?: string;
}

export function StatTile({ label, value, hint, tone = 'accent', className }: StatTileProps) {
  return (
    <Card className={cn('space-y-1 bg-contrast/5 text-center', className)}>
      <p className={cn('text-2xl font-light', toneStyles[tone])}>{value}</p>
      <p className="text-xs uppercase tracking-wider text-contrast/60">{label}</p>
      {hint && <p className="text-xs text-contrast/50">{hint}</p>}
    </Card>
  );
}
