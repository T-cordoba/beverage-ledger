'use client';

import { Slot } from '@radix-ui/react-slot';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

const variantStyles = {
  primary: 'bg-accent text-background shadow-panel hover:bg-accent-hover',
  secondary:
    'bg-surface-raised/50 text-contrast hover:bg-surface-raised hover:text-foreground border border-border/40',
  ghost: 'text-contrast/60 hover:bg-contrast/10 hover:text-contrast',
  danger: 'bg-danger-strong text-contrast hover:bg-danger-strong/90',
  'danger-outline':
    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50',
} as const;

const sizeStyles = {
  xs: 'h-7 gap-1.5 px-2 text-xs',
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
  icon: 'h-10 w-10',
  'icon-sm': 'h-8 w-8',
} as const;

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  isLoading?: boolean;
  /**
   * Renders the styles onto the child element instead of a `<button>`, so a
   * link or a Radix trigger can look like a button without nesting two
   * interactive elements.
   */
  asChild?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  asChild = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-base',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading && <Spinner size="sm" className="border-current border-t-transparent" />}
      {children}
    </button>
  );
}
