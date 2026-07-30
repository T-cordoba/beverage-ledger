'use client';

import Link from 'next/link';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { formatDateTime, pluralize } from '@/lib/utils';
import { useRecentMovements } from './api';
import { MovementStatusBadge, MovementTypeBadge } from './MovementCard';

const SHORTLIST_SIZE = 6;

export function RecentMovementsCard({ enabled = true }: { enabled?: boolean }) {
  const { data, error, isPending } = useRecentMovements(SHORTLIST_SIZE, enabled);
  const movements = data?.data ?? [];

  return (
    <Card className="min-w-0 space-y-4 bg-contrast/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-accent">Latest movements</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.movements}>Full history</Link>
        </Button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading the latest movements" />
        </div>
      ) : error ? (
        <EmptyState title="The latest movements could not be loaded." />
      ) : movements.length === 0 ? (
        <EmptyState title="Nothing has been recorded yet." />
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
                {formatDateTime(movement.occurredAt)} · {movement.itemCount}{' '}
                {pluralize(movement.itemCount, 'line')} · {movement.createdBy.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
