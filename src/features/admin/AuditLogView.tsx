'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  DataTable,
  DatePicker,
  EmptyState,
  Input,
  Select,
  type DataTableColumn,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import type { AuditLog } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import { formatDateTime, parseDateKey } from '@/lib/utils';
import { useAuditLogs, useUsers, type AuditQuery } from './api';

/** The metadata is flat scalars by contract, so one line reads it all. */
function describeMetadata(metadata: AuditLog['metadata']): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

const columns: DataTableColumn<AuditLog>[] = [
  {
    key: 'createdAt',
    header: 'When',
    cell: (log) => <span className="text-contrast/70">{formatDateTime(log.createdAt)}</span>,
  },
  {
    key: 'user',
    header: 'Who',
    cell: (log) =>
      log.user ? (
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground">{log.user.name}</p>
          <p className="truncate text-xs text-contrast/50">{log.user.email}</p>
        </div>
      ) : (
        <span className="text-xs text-contrast/50">system</span>
      ),
  },
  {
    key: 'action',
    header: 'Action',
    cell: (log) => <span className="font-mono text-xs text-accent">{log.action}</span>,
  },
  {
    key: 'entity',
    header: 'Entity',
    hideBelow: 'sm',
    cell: (log) => (
      <div className="min-w-0 space-y-0.5">
        <p className="text-contrast/70">{log.entity}</p>
        {log.entityId && (
          <p className="truncate font-mono text-xs text-contrast/40">{log.entityId}</p>
        )}
      </div>
    ),
  },
  {
    key: 'metadata',
    header: 'Detail',
    hideBelow: 'lg',
    cell: (log) => (
      <span className="text-xs text-contrast/60">{describeMetadata(log.metadata)}</span>
    ),
  },
  {
    key: 'ipAddress',
    header: 'From',
    align: 'end',
    hideBelow: 'lg',
    cell: (log) => (
      <span className="font-mono text-xs text-contrast/50">{log.ipAddress ?? '—'}</span>
    ),
  },
];

/** The picker speaks calendar days; the API takes an instant on each end. */
function dayBounds(dateKey: string): { from: string; to: string } {
  const start = parseDateKey(dateKey);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function AuditLogView() {
  const { can } = useAuth();
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [day, setDay] = useState('');

  const debouncedEntity = useDebouncedValue(entity);
  const debouncedAction = useDebouncedValue(action);

  // The trail names its actors, but only a user manager can list them to filter by.
  const canListUsers = can('user:manage');
  const { data: userPages } = useUsers(canListUsers);
  const users = canListUsers ? (userPages?.pages.flatMap((page) => page.data) ?? []) : [];

  const query = useMemo<AuditQuery>(
    () => ({
      ...(debouncedEntity ? { entity: debouncedEntity } : {}),
      ...(debouncedAction ? { action: debouncedAction } : {}),
      ...(userId ? { userId } : {}),
      ...(day ? dayBounds(day) : {}),
    }),
    [day, debouncedAction, debouncedEntity, userId],
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useAuditLogs(query);

  const logs = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Boolean(entity || action || userId || day);

  const clearFilters = () => {
    setEntity('');
    setAction('');
    setUserId('');
    setDay('');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">Audit log</h1>
        <p className="text-sm text-contrast/60">
          Who did what, when, and from where. Before this existed the app could not answer any of
          those.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          placeholder="Entity, like movement"
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          aria-label="Filter by entity"
        />
        <Input
          type="search"
          placeholder="Action, like movement.confirmed"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          aria-label="Filter by action"
        />
        {canListUsers && (
          <Select
            value={userId}
            onValueChange={setUserId}
            aria-label="Filter by user"
            options={[
              { value: '', label: 'Anyone' },
              ...users.map((user) => ({ value: user.id, label: user.name })),
            ]}
          />
        )}
        <DatePicker value={day} onChange={setDay} placeholder="Filter by date" />
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {error ? (
        <EmptyState
          title="The audit log could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption="Audit trail"
            columns={columns}
            rows={logs}
            rowKey={(log) => log.id}
            isLoading={isPending}
            loadingLabel="Loading the audit log"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title={hasFilters ? 'Nothing matches those filters.' : 'Nothing recorded yet.'}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </Card>
      )}

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
    </div>
  );
}
