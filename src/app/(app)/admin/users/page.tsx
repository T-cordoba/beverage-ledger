import { UsersView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export const metadata = { title: 'Users · Beverage Ledger' };

export default function AdminUsersPage() {
  return (
    <PermissionGate permission="user:manage">
      <UsersView />
    </PermissionGate>
  );
}
