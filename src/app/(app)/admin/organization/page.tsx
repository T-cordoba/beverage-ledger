import { OrganizationView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export const metadata = { title: 'Organization · Beverage Ledger' };

export default function AdminOrganizationPage() {
  return (
    <PermissionGate permission="organization:manage">
      <OrganizationView />
    </PermissionGate>
  );
}
