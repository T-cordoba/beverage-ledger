'use client';

import { useFormatter, useTranslations } from 'next-intl';
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
  const t = useTranslations('movements.detail.cancel');
  const tStates = useTranslations('common.states');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useCancelMovement();
  const notify = useNotify();

  const variant = movement.status === 'DRAFT' ? 'draft' : 'confirmed';

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await cancel.mutateAsync({ id: movement.id, reason });
      setIsOpen(false);
      setReason('');
      notify(
        'success',
        t(`${variant}.successTitle`),
        t(`${variant}.successDescription`, { code: movement.code }),
      );
    } catch (error) {
      notify('error', t(`${variant}.failed`), describeError(error, tStates('tryAgain')));
    }
  };

  return (
    <>
      <Button variant="danger-outline" size="sm" onClick={() => setIsOpen(true)}>
        {t(`${variant}.verb`)}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <DialogTitle>{t(`${variant}.title`, { code: movement.code })}</DialogTitle>
            <DialogDescription>{t(`${variant}.description`)}</DialogDescription>

            <div className="space-y-2 text-left">
              <label
                htmlFor="cancel-reason"
                className="block text-xs font-medium uppercase tracking-wider text-contrast/70"
              >
                {t('reason')}
              </label>
              <Input
                id="cancel-reason"
                required
                minLength={MIN_REASON_LENGTH}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t(`${variant}.placeholder`)}
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
                {t('keep')}
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="lg"
                className="flex-1"
                isLoading={cancel.isPending}
              >
                {t(`${variant}.verb`)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmDraftButton({ movement }: { movement: Movement }) {
  const t = useTranslations('movements.detail');
  const tStates = useTranslations('common.states');
  const confirm = useConfirmMovement();
  const notify = useNotify();

  const submit = async () => {
    try {
      await confirm.mutateAsync(movement.id);
      notify('success', t('confirmedTitle'), t('confirmedDescription', { code: movement.code }));
    } catch (error) {
      notify('error', t('confirmFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  return (
    <Button size="sm" isLoading={confirm.isPending} onClick={() => void submit()}>
      {t('confirm')}
    </Button>
  );
}

export function MovementDetailView({ id }: { id: string }) {
  const t = useTranslations('movements.detail');
  const tUnits = useTranslations('common.units');
  const format = useFormatter();
  const { can } = useAuth();
  const { data: movement, error, isPending } = useMovement(id);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (error || !movement) {
    return (
      <EmptyState
        title={t('notFound')}
        description={t('notFoundDescription')}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.movements}>{t('backToHistory')}</Link>
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
            ← {t('backToHistory')}
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
          <p className="text-sm text-contrast/80">{t('draftNotice')}</p>
        </Card>
      )}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={t('occurredAt')}>
            {format.dateTime(new Date(movement.occurredAt), 'full')}
          </Detail>
          <Detail label={t('registeredBy')}>{movement.createdBy.name}</Detail>
          <Detail label={t('createdAt')}>
            {format.dateTime(new Date(movement.createdAt), 'full')}
          </Detail>
          {movement.confirmedAt && (
            <Detail label={t('confirmedAt')}>
              {format.dateTime(new Date(movement.confirmedAt), 'full')}
            </Detail>
          )}
          {movement.cancelledAt && (
            <Detail label={t('cancelledAt')}>
              {format.dateTime(new Date(movement.cancelledAt), 'full')}
            </Detail>
          )}
          {movement.reason && <Detail label={t('reason')}>{movement.reason}</Detail>}
          {movement.note && <Detail label={t('note')}>{movement.note}</Detail>}
        </dl>
      </Card>

      <Card className="p-0">
        <h2 className="border-b border-border/40 p-4 text-lg font-light text-foreground sm:p-6">
          {t('lines', { count: movement.items.length })}
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
                  {t('baseUnits', { count: item.quantityBase })}
                </p>
              </div>

              <span className="shrink-0 text-right font-medium text-accent">
                {item.quantity}{' '}
                {tUnits(item.unit === 'CASE' ? 'case' : 'bottle', { count: item.quantity })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
