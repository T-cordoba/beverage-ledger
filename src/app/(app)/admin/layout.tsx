import type { ReactNode } from 'react';
import { ADMIN_NAVIGATION } from '@/config/navigation';
import { SectionNav } from '@/features/auth';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="space-y-6">
      <SectionNav items={ADMIN_NAVIGATION} label="admin" />
      {children}
    </div>
  );
}
