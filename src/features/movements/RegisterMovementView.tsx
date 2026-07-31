'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
  Textarea,
  useNotify,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { useCatalogFilters } from '@/features/catalog';
import { LocationSelect } from '@/features/locations';
import { describeError, type MovementType } from '@/lib/api';
import { parseDateKey } from '@/lib/utils';
import { useCancelMovement, useOpenDraft, useRegisterMovement, useResumeDraft } from './api';
import { MIN_REASON_LENGTH, MOVEMENT_TYPES } from './movement-types';
import { ProductPicker } from './ProductPicker';
import { useMovementDraft, type MovementDraft } from './useMovementDraft';

/** Reads the accent span out of a rich message, so it is written once. */
const strong = (chunks: ReactNode) => <span className="font-medium text-accent">{chunks}</span>;

/**
 * Every captured line, on demand.
 *
 * In a dialog rather than down the page: the picker between the form and here is
 * as long as the catalogue, so the list this is checked against was a scroll
 * away from the bar that acts on it — which is the one moment it matters.
 */
function DraftSummaryDialog({
  draft,
  isSigned,
  open,
  onOpenChange,
}: {
  draft: MovementDraft;
  isSigned: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('movements.register.summary');
  const tUnits = useTranslations('common.units');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  /** Signed quantities read as `-2 bottles`, so the noun follows the magnitude. */
  const describe = (quantity: number, unit: 'bottle' | 'case') => {
    const amount = isSigned ? format.number(quantity, 'signed') : quantity;
    return `${amount} ${tUnits(unit, { count: Math.abs(quantity) })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-4 text-left">
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('lines')}</DialogDescription>

        {/* A long capture would otherwise push the totals off the bottom. */}
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {draft.lines.map((line) => {
            const parts: string[] = [];
            if (line.BOTTLE !== 0) parts.push(describe(line.BOTTLE, 'bottle'));
            if (line.CASE !== 0) parts.push(describe(line.CASE, 'case'));

            return (
              <li key={line.product.id} className="flex justify-between gap-4 text-sm sm:text-base">
                <span className="font-light text-contrast">{line.product.name}</span>
                <span className="shrink-0 font-medium text-accent">{parts.join(' + ')}</span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-contrast/10 pt-3 text-sm">
          <span className="font-medium text-contrast/80">{t('total')}</span>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-accent">
              {describe(draft.totalBottles, 'bottle')}
            </span>
            <span className="text-contrast/60">•</span>
            <span className="font-semibold text-accent">{describe(draft.totalCases, 'case')}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {tActions('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RegisterMovementView({ type }: { type: MovementType }) {
  const t = useTranslations('movements.register');
  const tTypes = useTranslations('movements.types');
  const tStates = useTranslations('common.states');
  const format = useFormatter();

  const meta = MOVEMENT_TYPES[type];
  const { can, user } = useAuth();
  const filters = useCatalogFilters();
  const draft = useMovementDraft(type);
  const notify = useNotify();
  const router = useRouter();
  const register = useRegisterMovement();
  const cancel = useCancelMovement();
  const resume = useResumeDraft();

  const { data: openDraft } = useOpenDraft(type, user?.id);

  // Offered only when there is nothing to lose here: a draft captured on this
  // device is the one the user is looking at, and replacing it would throw away
  // work to recover older work.
  const resumable =
    openDraft && draft.isEmpty && openDraft.id !== draft.pendingMovementId ? openDraft : null;

  const pickUp = async (movementId: string) => {
    try {
      draft.restore(await resume.mutateAsync(movementId));
      notify('info', t('pickedUpTitle'), t('pickedUpDescription'));
    } catch (error) {
      notify('error', t('pickUpFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const trimmedReason = draft.reason.trim();
  const isReasonMissing = meta.requiresReason && trimmedReason.length < MIN_REASON_LENGTH;
  // Elsewhere an omitted location resolves to the default, which is a sane
  // answer. On a transfer it is not: leaving the origin empty when the default
  // is already the destination would ask to move stock onto itself, so both ends
  // are named explicitly.
  const isDestinationMissing = meta.needsDestination && draft.destinationLocationId === '';
  const isOriginMissing = meta.needsDestination && draft.locationId === '';
  const isIncomplete = isReasonMissing || isDestinationMissing || isOriginMissing;

  const totalUnits = meta.isSigned
    ? format.number(draft.totalBaseUnits, 'signed')
    : String(draft.totalBaseUnits);

  const submit = async () => {
    try {
      const movement = await register.mutateAsync({
        type,
        items: draft.toItems(),
        locationId: draft.locationId || undefined,
        destinationLocationId: meta.needsDestination
          ? draft.destinationLocationId || undefined
          : undefined,
        // A date key is a calendar day; the API takes an instant. Omitted means
        // now, which is what an empty picker stands for.
        occurredAt: draft.occurredAt ? parseDateKey(draft.occurredAt).toISOString() : undefined,
        reason: trimmedReason || undefined,
        note: draft.note.trim() || undefined,
        draftId: draft.pendingMovementId,
        onDraftOpened: draft.rememberPending,
      });

      draft.clear();
      setIsConfirmOpen(false);
      notify('success', t('registeredTitle'), t('registeredDescription', { code: movement.code }));
      router.push(ROUTES.movement(movement.id));
    } catch (error) {
      setIsConfirmOpen(false);
      notify('error', t('registerFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  /**
   * Clearing the local draft is not enough when the API already holds one: that
   * would leave exactly the orphan this flow is meant to avoid. Voiding it needs
   * the permission, so an operator's draft stays for a manager to close.
   */
  const discard = async () => {
    const pending = draft.pendingMovementId;
    const canVoid = can('movement:cancel');

    draft.clear();
    setIsDiscardOpen(false);

    if (pending && canVoid) {
      try {
        await cancel.mutateAsync({ id: pending, reason: 'Draft discarded before confirmation' });
      } catch {
        // Already voided, or gone. Either way there is nothing left to discard.
      }
    }

    notify(
      'info',
      t('discardedTitle'),
      pending && !canVoid ? t('discardedDraftKept') : t('discardedNothingSent'),
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">
          {tTypes(`${type}.action`)}
        </h1>
        <p className="text-sm text-contrast/60">{tTypes(`${type}.effect`)}</p>
      </header>

      {draft.pendingMovementId && (
        <Card className="border-warning/30 bg-warning/10">
          <p className="text-sm text-contrast/80">
            {t('pendingDraft')}{' '}
            <Link
              href={ROUTES.movement(draft.pendingMovementId)}
              className="text-accent hover:underline"
            >
              {t('openDraft')}
            </Link>
            .
          </p>
        </Card>
      )}

      {resumable && (
        <Card className="flex flex-col gap-3 border-info/30 bg-info/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-contrast/80">
            {t.rich('resumable', {
              code: resumable.code,
              count: resumable.itemCount,
              strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            isLoading={resume.isPending}
            onClick={() => void pickUp(resumable.id)}
          >
            {t('pickUp')}
          </Button>
        </Card>
      )}

      <Card className="grid gap-4 bg-contrast/5 sm:grid-cols-2">
        <Field
          label={t('fields.occurredAt.label')}
          hint={t('fields.occurredAt.hint')}
          className="sm:col-span-1"
        >
          {() => (
            <DatePicker
              value={draft.occurredAt}
              onChange={draft.setOccurredAt}
              placeholder={t('fields.occurredAt.placeholder')}
            />
          )}
        </Field>

        <Field
          label={meta.needsDestination ? t('fields.origin.label') : t('fields.location.label')}
          hint={meta.needsDestination ? t('fields.origin.hint') : t('fields.location.hint')}
          error={isOriginMissing ? t('fields.origin.missing') : undefined}
        >
          {({ id, describedBy }) => (
            <LocationSelect
              id={id}
              aria-describedby={describedBy}
              anyLabel={meta.needsDestination ? t('fields.origin.any') : undefined}
              value={draft.locationId}
              onValueChange={draft.setLocationId}
              excludeId={meta.needsDestination ? draft.destinationLocationId : undefined}
            />
          )}
        </Field>

        {meta.needsDestination && (
          <Field
            label={t('fields.destination.label')}
            hint={t('fields.destination.hint')}
            error={isDestinationMissing ? t('fields.destination.missing') : undefined}
          >
            {({ id, describedBy }) => (
              <LocationSelect
                id={id}
                aria-describedby={describedBy}
                anyLabel={t('fields.destination.any')}
                value={draft.destinationLocationId}
                onValueChange={draft.setDestinationLocationId}
                excludeId={draft.locationId}
              />
            )}
          </Field>
        )}

        {meta.requiresReason && (
          <Field
            label={t('fields.reason.label')}
            hint={t('fields.reason.hint')}
            error={
              draft.reason.length > 0 && isReasonMissing
                ? t('fields.reason.tooShort', { count: MIN_REASON_LENGTH })
                : undefined
            }
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={draft.reason}
                onChange={(event) => draft.setReason(event.target.value)}
                placeholder={t('fields.reason.placeholder')}
              />
            )}
          </Field>
        )}

        <Field
          label={t('fields.note.label')}
          hint={t('fields.note.hint')}
          className="sm:col-span-2"
        >
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={draft.note}
              onChange={(event) => draft.setNote(event.target.value)}
              placeholder={t('fields.note.placeholder')}
            />
          )}
        </Field>
      </Card>

      <ProductPicker filters={filters} draft={draft} />

      {!draft.isEmpty && (
        <>
          <div className="sticky bottom-4 z-floating">
            <Card className="flex flex-col items-center gap-3 border-accent/30 bg-surface/95 sm:flex-row sm:justify-between">
              <button
                type="button"
                className="rounded-lg text-left text-sm text-contrast/80 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                onClick={() => setIsSummaryOpen(true)}
              >
                {t.rich('summary.counts', {
                  products: draft.productCount,
                  units: totalUnits,
                  unitsAbs: Math.abs(draft.totalBaseUnits),
                  strong,
                })}
              </button>

              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setIsSummaryOpen(true)}
                >
                  {t('viewSummary')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setIsDiscardOpen(true)}
                  disabled={register.isPending}
                >
                  {t('discard')}
                </Button>
                <Button
                  size="lg"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isIncomplete}
                  isLoading={register.isPending}
                >
                  {t('confirm')}
                </Button>
              </div>
            </Card>
          </div>

          {isReasonMissing && (
            <p className="text-center text-sm text-warning">{t('reasonRequired')}</p>
          )}

          {(isOriginMissing || isDestinationMissing) && (
            <p className="text-center text-sm text-warning">{t('bothEndsRequired')}</p>
          )}
        </>
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        icon={
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        title={tTypes(`${type}.confirmQuestion`)}
        description={t.rich('confirmDescription', {
          products: draft.productCount,
          units: totalUnits,
          unitsAbs: Math.abs(draft.totalBaseUnits),
          strong,
        })}
        cancelLabel={t('goBack')}
        confirmLabel={t('confirm')}
        onConfirm={() => void submit()}
        isConfirming={register.isPending}
      />

      <DraftSummaryDialog
        draft={draft}
        isSigned={meta.isSigned}
        open={isSummaryOpen}
        onOpenChange={setIsSummaryOpen}
      />

      <ConfirmDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        tone="danger"
        title={t('discardTitle')}
        description={t('discardDescription')}
        cancelLabel={t('keep')}
        confirmLabel={t('discard')}
        onConfirm={() => void discard()}
      />
    </div>
  );
}
