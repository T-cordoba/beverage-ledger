'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  EmptyState,
  Input,
  Spinner,
  useNotify,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { describeError, type Movement } from '@/lib/api';
import { formatDateTime, pluralize } from '@/lib/utils';
import { useCancelMovement, useConfirmMovement, useMovement } from './api';
import { MIN_REASON_LENGTH, MOVEMENT_TYPES } from './movement-types';
import { MovementPdfButton } from './MovementPdfButton';
import { MovementStatusBadge, MovementTypeBadge } from './MovementCard';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Voiding and discarding are the same call: cancelling. Only the copy differs,
 * because a draft never touched stock and so has nothing to give back.
 */
function CancelMovementDialog({ movement }: { movement: Movement }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useCancelMovement();
  const notify = useNotify();

  const isDraft = movement.status === 'DRAFT';
  const verb = isDraft ? 'Discard' : 'Void';

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await cancel.mutateAsync({ id: movement.id, reason });
      setIsOpen(false);
      setReason('');
      notify(
        'success',
        isDraft ? 'Draft discarded' : 'Movement voided',
        isDraft
          ? `${movement.code} was closed without ever touching stock.`
          : `${movement.code} was reverted and stock returned.`,
      );
    } catch (error) {
      notify(
        'error',
        `Could not ${verb.toLowerCase()} the movement`,
        describeError(error, 'Please try again.'),
      );
    }
  };

  return (
    <>
      <Button variant="danger-outline" size="sm" onClick={() => setIsOpen(true)}>
        {verb}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <DialogTitle>
              {verb} {movement.code}?
            </DialogTitle>
            <DialogDescription>
              {isDraft
                ? 'The draft is closed and stops showing up as pending. Stock is untouched, because a draft never applied.'
                : 'Whatever this movement took from stock goes back. The movement is kept, marked as cancelled — the ledger is never rewritten.'}
            </DialogDescription>

            <div className="space-y-2 text-left">
              <label
                htmlFor="cancel-reason"
                className="block text-xs font-medium uppercase tracking-wider text-contrast/70"
              >
                Reason
              </label>
              <Input
                id="cancel-reason"
                required
                minLength={MIN_REASON_LENGTH}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={isDraft ? 'Why is it being discarded?' : 'Why is it being voided?'}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setIsOpen(false)}
                disabled={cancel.isPending}
              >
                Keep it
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="lg"
                className="flex-1"
                isLoading={cancel.isPending}
              >
                {verb}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmDraftButton({ movement }: { movement: Movement }) {
  const confirm = useConfirmMovement();
  const notify = useNotify();

  const submit = async () => {
    try {
      await confirm.mutateAsync(movement.id);
      notify('success', 'Movement confirmed', `${movement.code} was applied to stock.`);
    } catch (error) {
      notify('error', 'Could not confirm the movement', describeError(error, 'Please try again.'));
    }
  };

  return (
    <Button size="sm" isLoading={confirm.isPending} onClick={() => void submit()}>
      Confirm
    </Button>
  );
}

export function MovementDetailView({ id }: { id: string }) {
  const { can } = useAuth();
  const { data: movement, error, isPending } = useMovement(id);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" label="Loading the movement" />
      </div>
    );
  }

  if (error || !movement) {
    return (
      <EmptyState
        title="That movement is not available."
        description="It may have been removed, or it belongs to another organization."
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.movements}>Back to history</Link>
          </Button>
        }
      />
    );
  }

  const isDraft = movement.status === 'DRAFT';
  const canCancel = can('movement:cancel') && movement.status !== 'CANCELLED';
  const canConfirm = isDraft && can(MOVEMENT_TYPES[movement.type].permission);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href={ROUTES.movements} className="text-sm text-contrast/60 hover:text-accent">
            ← Movement history
          </Link>
          <h1 className="font-mono text-2xl text-accent sm:text-3xl">{movement.code}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <MovementTypeBadge type={movement.type} />
            <MovementStatusBadge status={movement.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MovementPdfButton id={movement.id} code={movement.code} />
          {canConfirm && <ConfirmDraftButton movement={movement} />}
          {canCancel && <CancelMovementDialog movement={movement} />}
        </div>
      </div>

      {isDraft && (
        <Card className="border-warning/30 bg-warning/10">
          <p className="text-sm text-contrast/80">
            This is a draft: it is captured but has not touched stock. Confirming applies it in a
            single transaction; discarding closes it without moving anything.
          </p>
        </Card>
      )}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Occurred at">{formatDateTime(movement.occurredAt)}</Detail>
          <Detail label="Registered by">{movement.createdBy.name}</Detail>
          <Detail label="Created at">{formatDateTime(movement.createdAt)}</Detail>
          {movement.confirmedAt && (
            <Detail label="Confirmed at">{formatDateTime(movement.confirmedAt)}</Detail>
          )}
          {movement.cancelledAt && (
            <Detail label="Cancelled at">{formatDateTime(movement.cancelledAt)}</Detail>
          )}
          {movement.reason && <Detail label="Reason">{movement.reason}</Detail>}
          {movement.note && <Detail label="Note">{movement.note}</Detail>}
        </dl>
      </Card>

      <Card className="p-0">
        <h2 className="border-b border-border/40 p-4 text-lg font-light text-foreground sm:p-6">
          Lines ({movement.items.length})
        </h2>

        <ul>
          {movement.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 border-b border-border/20 p-4 last:border-b-0 sm:p-6"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-contrast">{item.productNameSnapshot}</p>
                {item.brandNameSnapshot && (
                  <p className="text-xs text-accent/70">{item.brandNameSnapshot}</p>
                )}
                <p className="text-xs text-contrast/50">
                  {item.quantityBase} base {pluralize(Math.abs(item.quantityBase), 'unit')}
                </p>
              </div>

              <span className="shrink-0 text-right font-medium text-accent">
                {item.quantity} {pluralize(item.quantity, item.unit.toLowerCase())}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
