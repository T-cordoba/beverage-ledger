import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MovementHistoryView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.history');
  return { title: t('title') };
}

export default function MovementsPage() {
  return <MovementHistoryView />;
}
