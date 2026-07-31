import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CategoriesView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.categories');
  return { title: t('title') };
}

export default function AdminCategoriesPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <CategoriesView />
    </PermissionGate>
  );
}
