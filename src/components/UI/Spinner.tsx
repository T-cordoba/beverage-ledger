import { cn } from '@/lib/utils';

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeStyles;
  className?: string;
  /** Announced by screen readers. Without it the spinner is decorative. */
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-accent/30 border-t-accent',
        sizeStyles[size],
        className,
      )}
    />
  );
}
