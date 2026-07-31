'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

/**
 * Radix reserves the empty string for "nothing selected", so no item may carry
 * `value=""`. Filters model "no filter" as `''`, so it is swapped for this
 * sentinel on the way in and swapped back before reaching the caller.
 */
const EMPTY_SENTINEL = '__empty__';

const toRadixValue = (value: string) => (value === '' ? EMPTY_SENTINEL : value);
const fromRadixValue = (value: string) => (value === EMPTY_SENTINEL ? '' : value);

const triggerSizes = {
  sm: 'h-10 rounded-lg px-3 text-sm',
  md: 'h-12 rounded-xl px-4 text-sm sm:rounded-2xl sm:px-6 sm:text-base',
} as const;

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  size?: keyof typeof triggerSizes;
  className?: string;
  disabled?: boolean;
  /** Lands on the trigger, so a `<label htmlFor>` can point at it. */
  id?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  disabled,
  id,
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={toRadixValue(value)}
      onValueChange={(next) => onValueChange(fromRadixValue(next))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'group flex w-full items-center justify-between gap-2 border border-border bg-surface/80 font-medium text-foreground',
          'transition-colors hover:border-accent/30',
          'focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          triggerSizes[size],
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-accent/60 transition-transform duration-base group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          className={cn(
            // The height is capped on the viewport, which is the box that
            // scrolls; here it would only clip it a second time.
            'z-dropdown min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-xl border border-border bg-surface shadow-overlay',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )}
        >
          {/* No ScrollUpButton/ScrollDownButton: they scroll on hover, which
              hijacks the wheel and the trackpad for anyone who just wanted to
              reach the item below. A plain overflow behaves as expected. */}
          <SelectPrimitive.Viewport className="max-h-64 w-full overflow-y-auto">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY_SENTINEL}
                value={toRadixValue(option.value)}
                className={cn(
                  'flex cursor-pointer select-none items-center justify-between gap-2 border-b border-border/40 px-4 py-3 text-sm last:border-b-0',
                  'text-foreground outline-none',
                  'data-[highlighted]:bg-accent/10 data-[highlighted]:text-accent',
                  'data-[state=checked]:bg-accent/20 data-[state=checked]:font-medium data-[state=checked]:text-accent',
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <CheckIcon className="h-4 w-4 shrink-0" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
