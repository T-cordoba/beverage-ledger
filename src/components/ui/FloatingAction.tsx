'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';

export interface FloatingActionItem {
  label: string;
  /** A link, or a handler. One or the other. */
  href?: string;
  onClick?: () => void;
  /**
   * The same glyph the desktop row draws for this action. Without it the two
   * ways into the same screen teach two different habits: one where the icon
   * says which direction stock is moving, one where four labels differ by a word.
   */
  icon?: ReactNode;
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
 *
 * The open menu is laid out inside the same fixed box as the button rather than
 * positioned against it. Any floating-element library — Radix's popover included
 * — places a panel from coordinates it measured once and refreshes on scroll and
 * resize. A phone's URL bar collapsing fires neither: it resizes the *visual*
 * viewport, so the button rides up with it while a measured panel stays where
 * the layout viewport used to be. Stacking the two in one flex column means
 * there is nothing to measure and nothing to drift.
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
  const menuId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
      // Escape is a retreat, so the caret goes back where it was opened from;
      // picking an item navigates instead, and there is nothing to return to.
      fabRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

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
      {/* Catches the tap that means "never mind". Invisible on purpose: the menu
          sits over a page the reader is still meant to see. */}
      {isOpen && (
        <div className="fixed inset-0" aria-hidden="true" onClick={() => setIsOpen(false)} />
      )}

      <div className="relative flex flex-col items-end gap-3">
        {isOpen && (
          <div
            id={menuId}
            className={cn(
              'w-60 space-y-2 rounded-2xl border border-border bg-background/95 p-2 shadow-overlay backdrop-blur-sm',
              'animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95',
            )}
          >
            {items.map((item, index) => {
              // The desktop row leads with the primary action and keeps the rest
              // secondary; the same order here means the same thing.
              const variant = index === 0 ? 'primary' : 'secondary';
              const shared = {
                variant,
                size: 'lg',
                className: 'w-full justify-start',
              } as const;

              return item.href ? (
                <Button key={item.label} {...shared} asChild>
                  <Link href={item.href} onClick={() => setIsOpen(false)}>
                    {item.icon}
                    {item.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  key={item.label}
                  {...shared}
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}

        <Fab
          ref={fabRef}
          aria-label={label}
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setIsOpen((open) => !open)}
        >
          <PlusIcon isOpen={isOpen} />
        </Fab>
      </div>
    </div>
  );
}
