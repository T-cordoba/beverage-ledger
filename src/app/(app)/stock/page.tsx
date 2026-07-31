import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { StockLevelsView } from '@/features/stock';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('stock.levels');
  return { title: t('title') };
}

export default async function StockPage() {
  const t = await getTranslations('stock');

  return (
    <PermissionGate permission="stock:read" title={t('denied')}>
      <StockLevelsView />
    </PermissionGate>
  );
}
