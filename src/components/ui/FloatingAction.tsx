'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './Popover';

export interface FloatingActionItem {
  label: string;
  /** A link, or a handler. One or the other. */
  href?: string;
  onClick?: () => void;
}

function PlusIcon({ isOpen }: { isOpen?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('h-6 w-6 transition-transform duration-base', isOpen && 'rotate-45')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The circle itself, so the three places that render one agree on its size. */
function Fab({ children, ...props }: ButtonProps) {
  return (
    <Button size="icon" className="h-14 w-14 rounded-full shadow-overlay" {...props}>
      {children}
    </Button>
  );
}

/**
 * The view's primary action, within thumb reach on a phone.
 *
 * Only below `sm`. Each page puts its action in its own header, and that header
 * is not sticky, so on a phone it scrolls away and the action goes with it — on a
 * desktop it does not, and a button beside the title is both more conventional
 * and easier to find. So this hides itself at `sm` and the header shows its
 * button from `sm` up; between them there is always exactly one way to act.
 */
export function FloatingAction({
  label,
  items,
  className,
}: {
  /** Names the control itself, for the collapsed state and for screen readers. */
  label: string;
  items: FloatingActionItem[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  const wrapper = cn('fixed bottom-4 right-4 z-floating sm:hidden', className);

  // A menu holding one thing is a button with an extra tap in front of it.
  if (items.length === 1) {
    const [only] = items;

    return (
      <div className={wrapper}>
        {only.href ? (
          <Fab aria-label={only.label} asChild>
            <Link href={only.href}>
              <PlusIcon />
            </Link>
          </Fab>
        ) : (
          <Fab aria-label={only.label} onClick={only.onClick}>
            <PlusIcon />
          </Fab>
        )}
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Fab aria-label={label}>
            <PlusIcon isOpen={isOpen} />
          </Fab>
        </PopoverTrigger>
        {/* In place rather than portalled, and with no collision flipping: both
            would have the panel positioned against the document while the button
            it hangs off rides the visual viewport. See `PopoverContent`. */}
        <PopoverContent
          portal={false}
          avoidCollisions={false}
          align="end"
          side="top"
          className="w-56 space-y-1 p-2"
        >
          {items.map((item) => (
            // A client navigation leaves the popover mounted, so it has to be
            // told to close.
            <PopoverClose asChild key={item.label}>
              {item.href ? (
                <Button variant="ghost" size="lg" className="w-full justify-start" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full justify-start"
                  onClick={item.onClick}
                >
                  {item.label}
                </Button>
              )}
            </PopoverClose>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
