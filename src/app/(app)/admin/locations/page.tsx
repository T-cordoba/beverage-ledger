import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { LocationsView } from '@/features/locations';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('locations');
  return { title: t('title') };
}

export default function AdminLocationsPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <LocationsView />
    </PermissionGate>
  );
}
