import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuditLogView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.audit');
  return { title: t('title') };
}

export default function AdminAuditPage() {
  return (
    <PermissionGate permission="audit:read">
      <AuditLogView />
    </PermissionGate>
  );
}
