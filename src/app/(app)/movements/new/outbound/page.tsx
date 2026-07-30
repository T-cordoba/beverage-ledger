import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register a dispatch · Beverage Ledger' };

export default function NewOutboundPage() {
  return (
    <PermissionGate
      permission={MOVEMENT_TYPES.OUTBOUND.permission}
      title="You cannot register dispatches."
    >
      <RegisterMovementView type="OUTBOUND" />
    </PermissionGate>
  );
}
