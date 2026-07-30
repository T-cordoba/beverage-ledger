import { PermissionGate } from '@/features/auth';
import { KardexView } from '@/features/stock';

export const metadata = { title: 'Kardex · Beverage Ledger' };

export default async function ProductStockPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <PermissionGate permission="stock:read" title="You cannot see stock levels.">
      <KardexView productId={productId} />
    </PermissionGate>
  );
}
