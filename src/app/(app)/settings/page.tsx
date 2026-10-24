import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsView } from '@/features/preferences';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings');
  return { title: t('title') };
}

/** No PermissionGate: these preferences belong to the device, not to a role. */
export default function SettingsPage() {
  return <SettingsView />;
}
