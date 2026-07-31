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
  step = 0,
  className,
}: {
  children: ReactNode;
  /**
   * Position in a row of siblings, which staggers their arrival. Counted in
   * steps rather than milliseconds so the length of one lives in --stagger-reveal
   * and not in whichever page happened to need it.
   */
  step?: number;
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
      // Fires a little inside the fold rather than ahead of it. Growing the
      // viewport downwards — a positive bottom margin — started the block while
      // it was still off screen, so under a slow scroll or on a 60Hz panel the
      // motion was over before there was anything to look at. The margin stays
      // small and the threshold low on purpose: shrink the root too far and the
      // section under the hero, which is already half on screen at load, never
      // reaches the line and reads as an empty section.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={step > 0 ? { transitionDelay: `calc(var(--stagger-reveal) * ${step})` } : undefined}
      className={cn(
        'transition-[opacity,transform,filter] duration-reveal ease-reveal',
        isVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
