'use client';

import { cn } from '@/lib/utils';
import { Button } from './Button';

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Rendered beside the group, and announced as its name. */
  label: string;
  className?: string;
}

/**
 * A handful of mutually exclusive options, all visible at once.
 *
 * Not a `Select`: with three or four short choices the extra click to open a
 * list costs more than the space the buttons take.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex w-full items-center justify-center gap-2 sm:w-auto', className)}
    >
      <span aria-hidden="true" className="shrink-0 text-sm font-medium text-contrast/80">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-lg border border-border bg-surface/80">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-none',
              value === option.value
                ? 'bg-accent text-background hover:bg-accent-hover'
                : 'bg-background/50 hover:bg-background/70',
            )}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
