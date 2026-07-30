import { RegisterMovementView } from '@/features/movements';

export const metadata = { title: 'Register a dispatch · Beverage Ledger' };

export default function NewOutboundPage() {
  return <RegisterMovementView type="OUTBOUND" />;
}
