'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  EmptyState,
  Input,
  Pagination,
  Select,
  Spinner,
} from '@/components/ui';
import type { MovementStatus, MovementType } from '@/lib/api';
import { useDebouncedValue, usePagination } from '@/lib/hooks';
import { parseDateKey } from '@/lib/utils';
import { useMovements, type MovementQuery } from './api';
import { MovementCard } from './MovementCard';
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
  const { data, error, isPending } = useMovements(query, pagination.params);

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
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
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

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label={t('loading')} />
        </div>
      ) : error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : movements.length === 0 ? (
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
      ) : (
        <>
          <div ref={pagination.anchorRef} className="grid scroll-mt-20 gap-4">
            {movements.map((movement) => (
              <MovementCard key={movement.id} movement={movement} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={data?.meta.total ?? 0}
            pageCount={data?.meta.pageCount ?? 1}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}
    </div>
  );
}
