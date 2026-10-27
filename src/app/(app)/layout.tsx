import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout';
import { AuthGuard } from '@/features/auth';
import { BrandAccent } from '@/features/preferences';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGuard>
      <BrandAccent />
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
