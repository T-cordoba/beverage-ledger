'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, DatePicker, EmptyState, Input, Select, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import type { MovementStatus, MovementType } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import { formatNumber, parseDateKey } from '@/lib/utils';
import { useMovements, type MovementQuery } from './api';
import { MovementCard } from './MovementCard';

const typeOptions: { value: '' | MovementType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'OUTBOUND', label: 'Dispatch' },
  { value: 'INBOUND', label: 'Inbound' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

const statusOptions: { value: '' | MovementStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** The picker speaks calendar days; the API takes an instant on each end. */
function dayBounds(dateKey: string): { from: string; to: string } {
  const start = parseDateKey(dateKey);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function MovementHistoryView() {
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [day, setDay] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<MovementQuery>(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(type ? { type: type as MovementType } : {}),
      ...(status ? { status: status as MovementStatus } : {}),
      ...(day ? dayBounds(day) : {}),
    }),
    [day, debouncedSearch, status, type],
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useMovements(query);

  const movements = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Boolean(search || type || status || day);

  const clearFilters = () => {
    setSearch('');
    setType('');
    setStatus('');
    setDay('');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">Movement history</h1>
          <p className="text-sm text-contrast/60">
            {isPending ? 'Loading…' : `${formatNumber(movements.length)} loaded`}
            {hasNextPage && ' — more available'}
          </p>
        </div>

        {can('movement:create-outbound') && (
          <Button size="lg" asChild>
            <Link href={ROUTES.newMovement('OUTBOUND')}>Register a dispatch</Link>
          </Button>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          placeholder="Search by code..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search movements by code"
          className="border-contrast/20 bg-background/50 backdrop-blur-sm"
        />

        <Select
          value={type}
          onValueChange={setType}
          aria-label="Filter by type"
          options={typeOptions}
        />

        <Select
          value={status}
          onValueChange={setStatus}
          aria-label="Filter by status"
          options={statusOptions}
        />

        <DatePicker value={day} onChange={setDay} placeholder="Filter by date" />
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading movements" />
        </div>
      ) : error ? (
        <EmptyState
          title="The history could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : movements.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No movements match those filters.' : 'No movements recorded yet.'}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4">
            {movements.map((movement) => (
              <MovementCard key={movement.id} movement={movement} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="lg"
                isLoading={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
