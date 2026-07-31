'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import type { MovementStatus, MovementSummary, MovementType } from '@/lib/api';
import { MovementPdfButton } from './MovementPdfButton';

const statusTones = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
} as const satisfies Record<MovementStatus, 'warning' | 'success' | 'danger'>;

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const t = useTranslations('movements.types');

  return <Badge tone={type === 'OUTBOUND' ? 'accent' : 'info'}>{t(`${type}.label`)}</Badge>;
}

export function MovementStatusBadge({ status }: { status: MovementStatus }) {
  const t = useTranslations('movements.status');

  return <Badge tone={statusTones[status]}>{t(status)}</Badge>;
}

export function MovementCard({ movement }: { movement: MovementSummary }) {
  const t = useTranslations('movements.card');
  const tUnits = useTranslations('common.units');
  const format = useFormatter();

  return (
    <article className="rounded-xl border border-contrast/10 bg-contrast/5 p-4 backdrop-blur-sm transition-colors hover:bg-contrast/10 sm:rounded-2xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MovementTypeBadge type={movement.type} />
            <MovementStatusBadge status={movement.status} />
          </div>

          <h3 className="font-mono text-lg text-accent sm:text-xl">
            <Link href={ROUTES.movement(movement.id)} className="hover:underline">
              {movement.code}
            </Link>
          </h3>

          <p className="text-sm font-light text-contrast/60">
            {format.dateTime(new Date(movement.occurredAt), 'full')}
          </p>
          <p className="text-xs font-light text-contrast/50">
            {movement.itemCount} {tUnits('line', { count: movement.itemCount })} ·{' '}
            {movement.createdBy.name}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.movement(movement.id)}>{t('details')}</Link>
          </Button>
          <MovementPdfButton id={movement.id} code={movement.code} />
        </div>
      </div>
    </article>
  );
}
