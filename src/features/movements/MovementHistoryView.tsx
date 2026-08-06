'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  EmptyState,
  Input,
  Pagination,
  RefreshButton,
  Select,
} from '@/components/ui';
import type { MovementStatus, MovementType } from '@/lib/api';
import { rowsOnPage, useDebouncedValue, useManualRefresh, usePagination } from '@/lib/hooks';
import { parseDateKey } from '@/lib/utils';
import { useMovements, type MovementQuery } from './api';
import { MovementCard, MovementCardSkeleton } from './MovementCard';
import { MOVEMENT_TYPE_ORDER } from './movement-types';
import { NewMovementActions, NewMovementFab } from './NewMovementActions';

const STATUSES: MovementStatus[] = ['CONFIRMED', 'DRAFT', 'CANCELLED'];

/** The picker speaks calendar days; the API takes an instant on each end. */
function dayBounds(dateKey: string): { from: string; to: string } {
  const start = parseDateKey(dateKey);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function MovementHistoryView() {
  const t = useTranslations('movements.history');
  const tTypes = useTranslations('movements.types');
  const tStatus = useTranslations('movements.status');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [day, setDay] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const typeOptions = [
    { value: '', label: t('allTypes') },
    ...MOVEMENT_TYPE_ORDER.map((value) => ({ value, label: tTypes(`${value}.label`) })),
  ];

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    ...STATUSES.map((value) => ({ value, label: tStatus(value) })),
  ];

  const query = useMemo<MovementQuery>(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(type ? { type: type as MovementType } : {}),
      ...(status ? { status: status as MovementStatus } : {}),
      ...(day ? dayBounds(day) : {}),
    }),
    [day, debouncedSearch, status, type],
  );

  const pagination = usePagination(JSON.stringify(query));
  const { data, error, isPending, isPlaceholderData, refetch } = useMovements(
    query,
    pagination.params,
  );

  // The query keeps the previous page on screen while the next one loads, which
  // is why `isPending` alone is not the answer: turning a page has data the
  // whole time, only from the page before it.
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  const isLoading = isPending || isPlaceholderData || isRefreshing;
  const movements = data?.data ?? [];
  const hasFilters = Boolean(search || type || status || day);

  const clearFilters = () => {
    setSearch('');
    setType('');
    setStatus('');
    setDay('');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </header>

      {/* On its own line rather than beside the heading: four named actions do
          not fit next to a title without wrapping into it. */}
      <NewMovementActions className="hidden sm:flex" />
      <NewMovementFab />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t('searchLabel')}
          className="border-contrast/20 bg-background/50 backdrop-blur-sm"
        />

        <Select
          value={type}
          onValueChange={setType}
          aria-label={t('filterType')}
          options={typeOptions}
        />

        <Select
          value={status}
          onValueChange={setStatus}
          aria-label={t('filterStatus')}
          options={statusOptions}
        />

        <DatePicker value={day} onChange={setDay} placeholder={t('filterDate')} />
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            {tActions('clearFilters')}
          </Button>
        </div>
      )}

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : isLoading || movements.length > 0 ? (
        <>
          {/* Ghost cards rather than a centred spinner: a spinner takes one line
              and then the page it was standing in for shoves everything below it
              down the screen. */}
          <div
            ref={pagination.anchorRef}
            className="grid scroll-mt-20 gap-4"
            role={isLoading ? 'status' : undefined}
            aria-busy={isLoading || undefined}
          >
            {isLoading ? (
              <>
                <span className="sr-only">{t('loading')}</span>
                {Array.from(
                  { length: rowsOnPage(pagination.page, pagination.pageSize, data?.meta.total) },
                  (_, index) => (
                    <MovementCardSkeleton key={index} />
                  ),
                )}
              </>
            ) : (
              movements.map((movement) => <MovementCard key={movement.id} movement={movement} />)
            )}
          </div>

          {data && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={data.meta.total}
              pageCount={data.meta.pageCount}
              isLoading={isLoading}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
        </>
      ) : (
        <EmptyState
          title={hasFilters ? t('emptyFiltered') : t('empty')}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                {tActions('clearFilters')}
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
