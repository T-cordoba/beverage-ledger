import { KardexView } from '@/features/stock';

export const metadata = { title: 'Kardex · Beverage Ledger' };

export default async function ProductStockPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return <KardexView productId={productId} />;
}
