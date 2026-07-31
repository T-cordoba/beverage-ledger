'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FieldControlProps {
  id: string;
  /** Undefined when there is nothing to describe, which is what the attribute wants. */
  describedBy: string | undefined;
  /** Goes straight into `aria-invalid`, and turns the control's border red. */
  invalid: boolean;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (control: FieldControlProps) => ReactNode;
  className?: string;
}

/**
 * Label, hint and error around a control, wired together.
 *
 * The control comes in as a function of its ids rather than as plain children:
 * the association is the whole point of the wrapper, and handing the caller the
 * ids is the only way to guarantee it without cloning elements.
 */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    // `data-invalid` is what a failed submit looks for when it jumps to the
    // first field that needs attention: marking the wrapper means a form gets
    // that for free, without a ref per control.
    <div data-invalid={error ? '' : undefined} className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-contrast/70"
      >
        {label}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && (
        <p id={hintId} className="text-xs text-contrast/50">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
