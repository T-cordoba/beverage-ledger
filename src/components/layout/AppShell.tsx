import type { ReactNode } from 'react';
import { AnimatedMain } from './AnimatedMain';
import { BottomNav } from './BottomNav';
import { Topbar } from './Topbar';

/**
 * Navigation sits at the top on a desktop and at the bottom on a phone, and
 * exactly one of the two renders at any width — see `BottomNav` for why.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topbar />
      <AnimatedMain>{children}</AnimatedMain>
      <BottomNav />
    </div>
  );
}
