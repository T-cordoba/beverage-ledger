import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.types.ADJUSTMENT');
  return { title: t('action') };
}

export default async function NewAdjustmentPage() {
  const t = await getTranslations('movements.types.ADJUSTMENT');

  return (
    <PermissionGate permission={MOVEMENT_TYPES.ADJUSTMENT.permission} title={t('denied')}>
      <RegisterMovementView type="ADJUSTMENT" />
    </PermissionGate>
  );
}
