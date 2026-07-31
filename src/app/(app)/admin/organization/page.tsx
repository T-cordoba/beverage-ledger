import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OrganizationView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.organization');
  return { title: t('title') };
}

export default function AdminOrganizationPage() {
  return (
    <PermissionGate permission="organization:manage">
      <OrganizationView />
    </PermissionGate>
  );
}
