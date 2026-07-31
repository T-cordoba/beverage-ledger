'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useRecentMovements } from './api';
import { MovementStatusBadge, MovementTypeBadge } from './MovementCard';

const SHORTLIST_SIZE = 6;

export function RecentMovementsCard({ enabled = true }: { enabled?: boolean }) {
  const t = useTranslations('movements.recent');
  const tUnits = useTranslations('common.units');
  const format = useFormatter();
  const { data, error, isPending } = useRecentMovements(SHORTLIST_SIZE, enabled);
  const movements = data?.data ?? [];

  return (
    <Card className="min-w-0 space-y-4 bg-contrast/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-accent">{t('title')}</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.movements}>{t('fullHistory')}</Link>
        </Button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner label={t('loading')} />
        </div>
      ) : error ? (
        <EmptyState title={t('loadFailed')} />
      ) : movements.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="space-y-2">
          {movements.map((movement) => (
            <li key={movement.id} className="rounded-lg bg-contrast/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={ROUTES.movement(movement.id)}
                  className="font-mono text-sm text-accent hover:underline"
                >
                  {movement.code}
                </Link>
                <div className="flex items-center gap-2">
                  <MovementTypeBadge type={movement.type} />
                  <MovementStatusBadge status={movement.status} />
                </div>
              </div>
              <p className="mt-1 truncate text-xs text-contrast/50">
                {format.dateTime(new Date(movement.occurredAt), 'full')} · {movement.itemCount}{' '}
                {tUnits('line', { count: movement.itemCount })} · {movement.createdBy.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
