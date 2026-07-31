import type { ReactNode } from 'react';
import { Footer, MarketingNav } from '@/components/layout';

/**
 * The public shell. No guard and no session required — what it shows changes
 * with the session, but it never waits for one.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    // `isolate` is what keeps the backdrop below: without a stacking context of
    // its own, a negative z-index child paints behind this element's background
    // instead of over it, and the gradients disappear.
    <div className="relative isolate flex min-h-screen flex-col bg-background text-foreground">
      {/*
        Decoration, and nothing else: a warm pool behind the hero and a fall-off
        towards the edges, so the near-black page has somewhere to look. Fixed
        rather than absolute so it stays with the viewport instead of scrolling
        away, and negative z-index so it paints over the page background but
        under every bit of content.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 animate-glow-in bg-landing"
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-vignette" />

      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
