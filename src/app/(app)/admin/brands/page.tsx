import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BrandsView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.brands');
  return { title: t('title') };
}

export default function AdminBrandsPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <BrandsView />
    </PermissionGate>
  );
}
