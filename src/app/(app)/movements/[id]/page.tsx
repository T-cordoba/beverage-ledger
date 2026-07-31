import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MovementDetailView } from '@/features/movements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('movements.detail');
  return { title: t('metaTitle') };
}

export default async function MovementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MovementDetailView id={id} />;
}
