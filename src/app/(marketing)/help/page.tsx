import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HelpGuide } from '@/features/help';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('help.guide');
  return { title: t('title') };
}

export default function HelpPage() {
  return <HelpGuide />;
}
