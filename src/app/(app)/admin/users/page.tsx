import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UsersView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.users');
  return { title: t('title') };
}

export default function AdminUsersPage() {
  return (
    <PermissionGate permission="user:manage">
      <UsersView />
    </PermissionGate>
  );
}
