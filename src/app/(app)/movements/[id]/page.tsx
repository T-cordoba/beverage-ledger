import { MovementDetailView } from '@/features/movements';

export const metadata = { title: 'Movement · Beverage Ledger' };

export default async function MovementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MovementDetailView id={id} />;
}
