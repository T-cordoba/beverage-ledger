import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.types.OUTBOUND');
  return { title: t('action') };
}

export default async function NewOutboundPage() {
  const t = await getTranslations('movements.types.OUTBOUND');

  return (
    <PermissionGate permission={MOVEMENT_TYPES.OUTBOUND.permission} title={t('denied')}>
      <RegisterMovementView type="OUTBOUND" />
    </PermissionGate>
  );
}
