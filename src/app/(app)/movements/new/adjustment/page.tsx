import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register an adjustment · Beverage Ledger' };

export default function NewAdjustmentPage() {
  return (
    <PermissionGate
      permission={MOVEMENT_TYPES.ADJUSTMENT.permission}
      title="You cannot register adjustments."
    >
      <RegisterMovementView type="ADJUSTMENT" />
    </PermissionGate>
  );
}
