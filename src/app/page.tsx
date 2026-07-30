import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/navigation';

/** TODO(phase-7): the landing page lives here, and the product moves behind it. */
export default function HomePage() {
  redirect(ROUTES.movements);
}
