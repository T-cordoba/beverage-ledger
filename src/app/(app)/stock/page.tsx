import { PermissionGate } from '@/features/auth';
import { StockLevelsView } from '@/features/stock';

export const metadata = { title: 'Stock · Beverage Ledger' };

export default function StockPage() {
  return (
    <PermissionGate permission="stock:read" title="You cannot see stock levels.">
      <StockLevelsView />
    </PermissionGate>
  );
}
