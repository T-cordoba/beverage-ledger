import { RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register an inbound · Beverage Ledger' };

export default function NewInboundPage() {
  return <RegisterMovementView type="INBOUND" />;
}
