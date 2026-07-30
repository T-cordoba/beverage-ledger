import { BrandsView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export const metadata = { title: 'Brands · Beverage Ledger' };

export default function AdminBrandsPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <BrandsView />
    </PermissionGate>
  );
}
