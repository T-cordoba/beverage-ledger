'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { MAIN_NAVIGATION, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { NAV_ICONS } from './nav-icons';

/**
 * A tab never narrows past this, which is what makes the strip scroll instead of
 * squeezing six labels into a row nobody can read. Below the count that fills
 * the screen they grow to share it evenly.
 */
const TAB_WIDTH = 'basis-20';

/** Layout rounding leaves a fraction of a pixel of scroll that means nothing. */
const EDGE_SLACK = 2;

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The fade that says there is more this way.
 *
 * Painted over the strip rather than beside it, so the tab at the edge is seen
 * to pass under it — a gap of empty bar would read as the end of the row.
 */
function EdgeFade({ side, isVisible }: { side: 'left' | 'right'; isVisible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-y-0 w-10 transition-opacity duration-slow',
        side === 'left' ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l',
        'from-surface via-surface/70 to-transparent',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

/**
 * The product's navigation on a phone, in the half of the screen the thumb
 * already reaches.
 *
 * It replaces a row of text pills in the header that scrolled sideways with
 * nothing to say so: whatever did not fit was, for all purposes, gone. The strip
 * still scrolls — six sections do not fit across a phone at a legible size — but
 * here each edge fades while there is something past it and clears when there is
 * not, and the section you are in scrolls itself into view.
 *
 * Below `sm` only: on a desktop the header does not scroll away, and a row
 * beside the title is both conventional there and no harder to reach.
 */
export function BottomNav() {
  const t = useTranslations('nav');
  const { can } = useAuth();
  const pathname = usePathname();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const items = visibleNavigation(MAIN_NAVIGATION, can);

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const remaining = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

    setEdges({ left: scroller.scrollLeft > EDGE_SLACK, right: remaining > EDGE_SLACK });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    measure();

    // Rotating the phone changes what fits without any scrolling happening.
    const observer = new ResizeObserver(measure);

    observer.observe(scroller);

    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    // Found by its own aria-current rather than held in a ref: the tab is a Link
    // rendered through a Radix slot, and reaching past that for a DOM node is
    // more machinery than a query the markup already answers.
    //
    // `nearest` on the block axis, because this is a horizontal strip and the
    // page behind it must not jump to centre a tab.
    scrollerRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <nav
      aria-label={t('main')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-sticky sm:hidden',
        'border-t border-border bg-surface/95 backdrop-blur-md',
        // Below the tabs, not inside them: the home indicator owns the last few
        // millimetres of the screen and a tap there belongs to the system.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={measure}
          // `overscroll-x-contain` so a swipe that runs out of strip stays here
          // instead of becoming the browser's back gesture.
          className="scrollbar-none flex h-16 items-stretch overflow-x-auto overscroll-x-contain"
        >
          {items.map((item) => {
            const isActive = isCurrent(pathname, item.href);

            return (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  'h-full shrink-0 grow flex-col gap-0.5 rounded-none px-1 py-2 text-[0.625rem]',
                  TAB_WIDTH,
                  isActive ? 'text-accent' : 'text-contrast/60',
                )}
              >
                <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                  {NAV_ICONS[item.label]}
                  {/* A button never wraps, and a label can be wider than its
                      share of the row, so this is where a long word is cut. */}
                  <span className="max-w-full truncate">{t(`items.${item.label}`)}</span>
                </Link>
              </Button>
            );
          })}
        </div>

        <EdgeFade side="left" isVisible={edges.left} />
        <EdgeFade side="right" isVisible={edges.right} />
      </div>
    </nav>
  );
}
