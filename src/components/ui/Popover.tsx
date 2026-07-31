'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Fragment, type ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

interface PopoverContentProps extends ComponentPropsWithRef<typeof PopoverPrimitive.Content> {
  /**
   * Portalling escapes any ancestor that clips or transforms, which is what an
   * overlay normally wants. It is wrong for a trigger that is itself `fixed`:
   * the portalled panel is placed by coordinates measured against the document,
   * while the trigger rides the visual viewport, so on a phone the two drift
   * apart as the URL bar collapses and only meet again once scrolling stops.
   * Rendered in place, the panel is laid out inside the fixed box and moves with
   * it.
   */
  portal?: boolean;
}

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 8,
  portal = true,
  ...props
}: PopoverContentProps) {
  const Wrapper = portal ? PopoverPrimitive.Portal : Fragment;

  return (
    <Wrapper>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-popover rounded-xl border border-border bg-background/95 p-4 shadow-overlay backdrop-blur-sm',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </Wrapper>
  );
}
