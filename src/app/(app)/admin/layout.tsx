import type { ReactNode } from 'react';
import { AdminNav } from '@/features/admin';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}
