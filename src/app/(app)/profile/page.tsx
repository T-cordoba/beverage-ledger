import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProfileView } from '@/features/profile';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');
  return { title: t('title') };
}

/** No PermissionGate: editing your own profile needs no permission beyond a session. */
export default function ProfilePage() {
  return <ProfileView />;
}
