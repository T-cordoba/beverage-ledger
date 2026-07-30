import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register a transfer · Beverage Ledger' };

export default function NewTransferPage() {
  return (
    <PermissionGate
      permission={MOVEMENT_TYPES.TRANSFER.permission}
      title="You cannot register transfers."
    >
      <RegisterMovementView type="TRANSFER" />
    </PermissionGate>
  );
}
