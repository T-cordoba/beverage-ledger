import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Whatever unblocks the user: a button that clears the filters, usually. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      {icon && <span className="text-accent/60">{icon}</span>}
      <p className="text-base font-light text-contrast/60 lg:text-lg">{title}</p>
      {description && <p className="max-w-md text-sm text-contrast/50">{description}</p>}
      {action}
    </div>
  );
}
