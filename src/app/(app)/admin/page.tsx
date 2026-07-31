import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminHome } from '@/features/admin';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('nav') };
}

export default function AdminPage() {
  return <AdminHome />;
}
