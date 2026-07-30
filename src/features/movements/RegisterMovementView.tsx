'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, ConfirmDialog, EmptyState, useNotify } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useCatalogFilters } from '@/features/catalog';
import { useAuth } from '@/features/auth';
import { describeError } from '@/lib/api';
import { pluralize } from '@/lib/utils';
import { useRegisterMovement } from './api';
import { ProductPicker } from './ProductPicker';
import { useMovementDraft, type MovementDraft } from './useMovementDraft';

function DraftSummary({ draft }: { draft: MovementDraft }) {
  return (
    <Card className="bg-contrast/5">
      <h3 className="mb-4 text-lg font-light text-foreground sm:text-xl">Dispatch summary</h3>

      <ul className="mb-4 space-y-2">
        {draft.lines.map((line) => {
          const parts: string[] = [];
          if (line.BOTTLE > 0) parts.push(`${line.BOTTLE} ${pluralize(line.BOTTLE, 'bottle')}`);
          if (line.CASE > 0) parts.push(`${line.CASE} ${pluralize(line.CASE, 'case')}`);

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
          <span className="font-semibold text-accent">
            {draft.totalBottles} {pluralize(draft.totalBottles, 'bottle')}
          </span>
          <span className="text-contrast/60">•</span>
          <span className="font-semibold text-accent">
            {draft.totalCases} {pluralize(draft.totalCases, 'case')}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function RegisterMovementView() {
  const { can } = useAuth();
  const filters = useCatalogFilters();
  const draft = useMovementDraft();
  const notify = useNotify();
  const router = useRouter();
  const register = useRegisterMovement();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  if (!can('movement:create-outbound')) {
    return (
      <EmptyState
        title="You cannot register dispatches."
        description="Ask an administrator for the permission if you need it."
      />
    );
  }

  const submit = async () => {
    try {
      const movement = await register.mutateAsync({ type: 'OUTBOUND', items: draft.toItems() });

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

  const discard = () => {
    draft.clear();
    setIsDiscardOpen(false);
    notify('info', 'Selection cleared', 'Nothing was sent to the ledger.');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">Register a dispatch</h1>
        <p className="text-sm text-contrast/60">
          Stock leaves the cellar when you confirm. Nothing moves before that.
        </p>
      </header>

      <ProductPicker filters={filters} draft={draft} />

      {!draft.isEmpty && (
        <>
          <DraftSummary draft={draft} />

          <div className="sticky bottom-4 z-floating">
            <Card className="flex flex-col items-center gap-3 border-accent/30 bg-surface/95 sm:flex-row sm:justify-between">
              <p className="text-sm text-contrast/80">
                <span className="font-medium text-accent">{draft.productCount}</span>{' '}
                {pluralize(draft.productCount, 'product')} ·{' '}
                <span className="font-medium text-accent">{draft.totalBaseUnits}</span>{' '}
                {pluralize(draft.totalBaseUnits, 'unit')}
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
                  isLoading={register.isPending}
                >
                  Confirm dispatch
                </Button>
              </div>
            </Card>
          </div>
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
        title="Confirm the dispatch"
        description={
          <>
            This writes{' '}
            <span className="font-medium text-accent">
              {draft.productCount} {pluralize(draft.productCount, 'product')}
            </span>{' '}
            to the ledger and takes{' '}
            <span className="font-medium text-accent">
              {draft.totalBaseUnits} {pluralize(draft.totalBaseUnits, 'unit')}
            </span>{' '}
            out of stock — cases counted by their case size.
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
        title="Discard the selection?"
        description="Everything you have picked will be cleared. No movement is created."
        cancelLabel="Keep it"
        confirmLabel="Discard"
        onConfirm={discard}
      />
    </div>
  );
}
