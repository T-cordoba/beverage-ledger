'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Slides its children in the first time they are scrolled to.
 *
 * One observer per block, disconnected as soon as it fires: the reveal is a
 * first impression, and replaying it on every scroll back up turns a page into a
 * fairground. Motion is honoured globally through prefers-reduced-motion, which
 * collapses the transition to nothing.
 *
 * The content is in the DOM from the first render either way — this only moves
 * and fades it — so a crawler and a reader with no JavaScript still get the page.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  /** Staggers a row of sibling cards. Keep it short; this is not a curtain. */
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      // No observer, no reveal: showing it beats leaving it transparent forever.
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      // Fires a little before the block reaches the bottom edge, so it has
      // finished arriving by the time it is actually being read.
      { rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-slow ease-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
