import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register an inbound · Beverage Ledger' };

export default function NewInboundPage() {
  return (
    <PermissionGate
      permission={MOVEMENT_TYPES.INBOUND.permission}
      title="You cannot register inbounds."
    >
      <RegisterMovementView type="INBOUND" />
    </PermissionGate>
  );
}
