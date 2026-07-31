import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { KardexView } from '@/features/stock';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('stock.kardex');
  return { title: t('metaTitle') };
}

export default async function ProductStockPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const t = await getTranslations('stock');

  return (
    <PermissionGate permission="stock:read" title={t('denied')}>
      <KardexView productId={productId} />
    </PermissionGate>
  );
}
