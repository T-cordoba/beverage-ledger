'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-overlay bg-scrim/70 backdrop-blur-sm',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-modal w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
          'rounded-2xl border border-border/50 bg-gradient-to-br from-surface to-background p-6 shadow-overlay sm:p-8',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-xl font-medium text-foreground sm:text-2xl', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('leading-relaxed text-contrast/80', className)}
      {...props}
    />
  );
}

/**
 * Stacked on a phone, side by side from `sm` up.
 *
 * Buttons in here share the row with `sm:flex-1`, never plain `flex-1`: while
 * the axis is vertical, `flex-1` means "grow in height", and with `flex-basis:0`
 * winning over the button's own height each one collapses to the height of its
 * text. Stacked, they already fill the width on their own.
 */
export function DialogFooter({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('flex flex-col gap-3 sm:flex-row sm:gap-4', className)} {...props} />;
}
