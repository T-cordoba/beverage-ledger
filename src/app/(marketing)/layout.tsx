import type { ReactNode } from 'react';
import { Footer, MarketingNav } from '@/components/layout';

/**
 * The public shell. No guard and no session required — what it shows changes
 * with the session, but it never waits for one.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
