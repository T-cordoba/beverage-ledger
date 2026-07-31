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
 */
export function AnimatedMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main
      key={pathname}
      className="mx-auto max-w-6xl animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
    >
      {children}
    </main>
  );
}
