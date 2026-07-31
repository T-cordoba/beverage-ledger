import type { ReactNode } from 'react';
import { AnimatedMain } from './AnimatedMain';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topbar />
      <AnimatedMain>{children}</AnimatedMain>
    </div>
  );
}
