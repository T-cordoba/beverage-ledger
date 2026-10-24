import type { ReactNode } from 'react';
import { CATALOG_NAVIGATION } from '@/config/navigation';
import { SectionNav } from '@/features/auth';

export default function CatalogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="space-y-6">
      <SectionNav items={CATALOG_NAVIGATION} label="catalog" />
      {children}
    </div>
  );
}
