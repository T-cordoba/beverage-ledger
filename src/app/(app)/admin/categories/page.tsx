import { CategoriesView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export const metadata = { title: 'Categories · Beverage Ledger' };

export default function AdminCategoriesPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <CategoriesView />
    </PermissionGate>
  );
}
