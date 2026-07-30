'use client';

import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import type { MovementStatus, MovementSummary, MovementType } from '@/lib/api';
import { formatDateTime, pluralize } from '@/lib/utils';
import { MovementPdfButton } from './MovementPdfButton';

const typeLabels: Record<MovementType, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Dispatch',
  ADJUSTMENT: 'Adjustment',
};

const statusTones = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
} as const satisfies Record<MovementStatus, 'warning' | 'success' | 'danger'>;

export function MovementTypeBadge({ type }: { type: MovementType }) {
  return <Badge tone={type === 'OUTBOUND' ? 'accent' : 'info'}>{typeLabels[type]}</Badge>;
}

export function MovementStatusBadge({ status }: { status: MovementStatus }) {
  return <Badge tone={statusTones[status]}>{status.toLowerCase()}</Badge>;
}

export function MovementCard({ movement }: { movement: MovementSummary }) {
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
            {formatDateTime(movement.occurredAt)}
          </p>
          <p className="text-xs font-light text-contrast/50">
            {movement.itemCount} {pluralize(movement.itemCount, 'line')} · {movement.createdBy.name}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.movement(movement.id)}>Details</Link>
          </Button>
          <MovementPdfButton id={movement.id} code={movement.code} />
        </div>
      </div>
    </article>
  );
}
