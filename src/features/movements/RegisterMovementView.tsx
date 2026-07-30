'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  DatePicker,
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
import { formatSignedNumber, parseDateKey, pluralize } from '@/lib/utils';
import { useCancelMovement, useOpenDraft, useRegisterMovement, useResumeDraft } from './api';
import { MIN_REASON_LENGTH, MOVEMENT_TYPES } from './movement-types';
import { ProductPicker } from './ProductPicker';
import { useMovementDraft, type MovementDraft } from './useMovementDraft';

/** Signed quantities read as `-2 bottles`, so the noun follows the magnitude. */
function describeUnit(quantity: number, unit: string): string {
  return `${formatSignedNumber(quantity)} ${pluralize(Math.abs(quantity), unit)}`;
}

function DraftSummary({ draft, isSigned }: { draft: MovementDraft; isSigned: boolean }) {
  const format = (quantity: number, unit: string) =>
    isSigned ? describeUnit(quantity, unit) : `${quantity} ${pluralize(quantity, unit)}`;

  return (
    <Card className="bg-contrast/5">
      <h3 className="mb-4 text-lg font-light text-foreground sm:text-xl">Lines</h3>

      <ul className="mb-4 space-y-2">
        {draft.lines.map((line) => {
          const parts: string[] = [];
          if (line.BOTTLE !== 0) parts.push(format(line.BOTTLE, 'bottle'));
          if (line.CASE !== 0) parts.push(format(line.CASE, 'case'));

          return (
            <li key={line.product.id} className="flex justify-between gap-4 text-sm sm:text-base">
              <span className="font-light text-contrast">{line.product.name}</span>
              <span className="shrink-0 font-medium text-accent">{parts.join(' + ')}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-contrast/10 pt-3 text-sm">
        <span className="font-medium text-contrast/80">Total</span>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-accent">{format(draft.totalBottles, 'bottle')}</span>
          <span className="text-contrast/60">•</span>
          <span className="font-semibold text-accent">{format(draft.totalCases, 'case')}</span>
        </div>
      </div>
    </Card>
  );
}

export function RegisterMovementView({ type }: { type: MovementType }) {
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
      notify('info', 'Draft picked up', 'What was captured is back. Confirming reuses it.');
    } catch (error) {
      notify('error', 'Could not pick up the draft', describeError(error, 'Please try again.'));
    }
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const trimmedReason = draft.reason.trim();
  const isReasonMissing = meta.requiresReason && trimmedReason.length < MIN_REASON_LENGTH;
  // Elsewhere an omitted location resolves to the default, which is a sane
  // answer. On a transfer it is not: leaving the origin empty when the default
  // is already the destination would ask to move stock onto itself, so both ends
  // are named explicitly.
  const isDestinationMissing = meta.needsDestination && draft.destinationLocationId === '';
  const isOriginMissing = meta.needsDestination && draft.locationId === '';
  const isIncomplete = isReasonMissing || isDestinationMissing || isOriginMissing;

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
      notify(
        'success',
        'Movement registered',
        `${movement.code} was confirmed and applied to stock.`,
      );
      router.push(ROUTES.movement(movement.id));
    } catch (error) {
      setIsConfirmOpen(false);
      notify('error', 'Could not register the movement', describeError(error, 'Please try again.'));
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
      'Draft discarded',
      pending && !canVoid
        ? 'What you captured is cleared. The open draft stays in the history for a manager to void.'
        : 'Nothing was sent to the ledger.',
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{meta.action}</h1>
        <p className="text-sm text-contrast/60">{meta.effect}</p>
      </header>

      {draft.pendingMovementId && (
        <Card className="border-warning/30 bg-warning/10">
          <p className="text-sm text-contrast/80">
            A draft is already open from an attempt that could not be confirmed. Fixing the
            quantities and confirming again reuses it, so no second movement is created.{' '}
            <Link
              href={ROUTES.movement(draft.pendingMovementId)}
              className="text-accent hover:underline"
            >
              Open the draft
            </Link>
            .
          </p>
        </Card>
      )}

      {resumable && (
        <Card className="flex flex-col gap-3 border-info/30 bg-info/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-contrast/80">
            <span className="font-medium text-foreground">{resumable.code}</span> is still a draft
            here, with {resumable.itemCount} {pluralize(resumable.itemCount, 'line')}. It was left
            open somewhere else — picking it up loads what was captured instead of starting again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            isLoading={resume.isPending}
            onClick={() => void pickUp(resumable.id)}
          >
            Pick it up
          </Button>
        </Card>
      )}

      <Card className="grid gap-4 bg-contrast/5 sm:grid-cols-2">
        <Field
          label="Occurred at"
          hint="Leave it empty to record it as happening now."
          className="sm:col-span-1"
        >
          {() => (
            <DatePicker value={draft.occurredAt} onChange={draft.setOccurredAt} placeholder="Now" />
          )}
        </Field>

        <Field
          label={meta.needsDestination ? 'From' : 'Location'}
          hint={
            meta.needsDestination
              ? 'Where the stock is leaving from.'
              : 'Which warehouse this movement lands on.'
          }
          error={isOriginMissing ? 'A transfer needs an origin.' : undefined}
        >
          {({ id, describedBy }) => (
            <LocationSelect
              id={id}
              aria-describedby={describedBy}
              anyLabel={meta.needsDestination ? 'Pick an origin' : undefined}
              value={draft.locationId}
              onValueChange={draft.setLocationId}
              excludeId={meta.needsDestination ? draft.destinationLocationId : undefined}
            />
          )}
        </Field>

        {meta.needsDestination && (
          <Field
            label="To"
            hint="Where it arrives. The total on hand does not change."
            error={isDestinationMissing ? 'A transfer needs a destination.' : undefined}
          >
            {({ id, describedBy }) => (
              <LocationSelect
                id={id}
                aria-describedby={describedBy}
                anyLabel="Pick a destination"
                value={draft.destinationLocationId}
                onValueChange={draft.setDestinationLocationId}
                excludeId={draft.locationId}
              />
            )}
          </Field>
        )}

        {meta.requiresReason && (
          <Field
            label="Reason"
            hint="Required, and kept on the audit trail."
            error={
              draft.reason.length > 0 && isReasonMissing
                ? `At least ${MIN_REASON_LENGTH} characters.`
                : undefined
            }
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={draft.reason}
                onChange={(event) => draft.setReason(event.target.value)}
                placeholder="Breakage, count variance, ..."
              />
            )}
          </Field>
        )}

        <Field
          label="Note"
          hint="Optional context for whoever reads this later."
          className="sm:col-span-2"
        >
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={draft.note}
              onChange={(event) => draft.setNote(event.target.value)}
              placeholder="Delivery number, shift, requesting bar..."
            />
          )}
        </Field>
      </Card>

      <ProductPicker filters={filters} draft={draft} />

      {!draft.isEmpty && (
        <>
          <DraftSummary draft={draft} isSigned={meta.isSigned} />

          <div className="sticky bottom-4 z-floating">
            <Card className="flex flex-col items-center gap-3 border-accent/30 bg-surface/95 sm:flex-row sm:justify-between">
              <p className="text-sm text-contrast/80">
                <span className="font-medium text-accent">{draft.productCount}</span>{' '}
                {pluralize(draft.productCount, 'product')} ·{' '}
                <span className="font-medium text-accent">
                  {meta.isSigned ? formatSignedNumber(draft.totalBaseUnits) : draft.totalBaseUnits}
                </span>{' '}
                {pluralize(Math.abs(draft.totalBaseUnits), 'unit')}
              </p>

              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setIsDiscardOpen(true)}
                  disabled={register.isPending}
                >
                  Discard
                </Button>
                <Button
                  size="lg"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isIncomplete}
                  isLoading={register.isPending}
                >
                  Confirm
                </Button>
              </div>
            </Card>
          </div>

          {isReasonMissing && (
            <p className="text-center text-sm text-warning">
              An adjustment needs a reason before it can be confirmed.
            </p>
          )}

          {(isOriginMissing || isDestinationMissing) && (
            <p className="text-center text-sm text-warning">
              A transfer needs both ends named before it can be confirmed.
            </p>
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
        title={`Confirm this ${meta.label.toLowerCase()}?`}
        description={
          <>
            This writes{' '}
            <span className="font-medium text-accent">
              {draft.productCount} {pluralize(draft.productCount, 'product')}
            </span>{' '}
            to the ledger and moves{' '}
            <span className="font-medium text-accent">
              {meta.isSigned ? formatSignedNumber(draft.totalBaseUnits) : draft.totalBaseUnits}{' '}
              {pluralize(Math.abs(draft.totalBaseUnits), 'unit')}
            </span>{' '}
            — cases counted by their case size.
          </>
        }
        cancelLabel="Go back"
        confirmLabel="Confirm"
        onConfirm={() => void submit()}
        isConfirming={register.isPending}
      />

      <ConfirmDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        tone="danger"
        title="Discard what you captured?"
        description="Every line, the date and the note are cleared. No movement is created."
        cancelLabel="Keep it"
        confirmLabel="Discard"
        onConfirm={() => void discard()}
      />
    </div>
  );
}
