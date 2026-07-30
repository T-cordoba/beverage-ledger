import { RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register an adjustment · Beverage Ledger' };

export default function NewAdjustmentPage() {
  return <RegisterMovementView type="ADJUSTMENT" />;
}
