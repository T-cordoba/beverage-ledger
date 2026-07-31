import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { ConsumptionReportView } from '@/features/reports';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports');
  return { title: t('title') };
}

export default async function ReportsPage() {
  const t = await getTranslations('reports');

  return (
    <PermissionGate permission="report:read" title={t('denied')}>
      <ConsumptionReportView />
    </PermissionGate>
  );
}
