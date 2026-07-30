import { AuditLogView } from '@/features/admin';
import { PermissionGate } from '@/features/auth';

export const metadata = { title: 'Audit log · Beverage Ledger' };

export default function AdminAuditPage() {
  return (
    <PermissionGate permission="audit:read">
      <AuditLogView />
    </PermissionGate>
  );
}
