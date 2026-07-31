import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PermissionGate } from '@/features/auth';
import { MOVEMENT_TYPES, RegisterMovementView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.types.TRANSFER');
  return { title: t('action') };
}

export default async function NewTransferPage() {
  const t = await getTranslations('movements.types.TRANSFER');

  return (
    <PermissionGate permission={MOVEMENT_TYPES.TRANSFER.permission} title={t('denied')}>
      <RegisterMovementView type="TRANSFER" />
    </PermissionGate>
  );
}
