'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The content area of the app, animated once per view.
 *
 * Keyed by pathname so the animation replays on each navigation: without the
 * key React keeps the element and only swaps what is inside, and the second
 * screen would arrive with no transition at all.
 *
 * One animation for the whole view rather than one per element. Staggering a
 * table of a hundred rows reads as the page being slow, not as it being polished.
 *
 * The bottom padding below `sm` is the berth for the two things fixed to that
 * edge: the navigation bar and the floating action button above it. Without the
 * room they sit on top of whatever ends the page, which on every list is the
 * pagination.
 */
export function AnimatedMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main
      key={pathname}
      className="mx-auto max-w-6xl animate-fade-in-up px-4 pb-44 pt-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-12 lg:pt-10"
    >
      {children}
    </main>
  );
}
