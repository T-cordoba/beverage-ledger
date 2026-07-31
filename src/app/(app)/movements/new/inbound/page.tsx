import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.types.INBOUND');
  return { title: t('action') };
}

export default async function NewInboundPage() {
  const t = await getTranslations('movements.types.INBOUND');

  return (
    <PermissionGate permission={MOVEMENT_TYPES.INBOUND.permission} title={t('denied')}>
      <RegisterMovementView type="INBOUND" />
    </PermissionGate>
  );
}
