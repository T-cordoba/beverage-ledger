import { ProfileView } from '@/features/profile';

export const metadata = { title: 'Profile · Beverage Ledger' };

/** No PermissionGate: editing your own profile needs no permission beyond a session. */
export default function ProfilePage() {
  return <ProfileView />;
}
