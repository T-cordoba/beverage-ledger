import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/navigation';

/** Dispatch is the movement everyone may record, so a bare /new lands there. */
export default function NewMovementPage() {
  redirect(ROUTES.newMovement('OUTBOUND'));
}
