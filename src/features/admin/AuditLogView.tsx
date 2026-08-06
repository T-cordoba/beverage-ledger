'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  DataTable,
  DatePicker,
  EmptyState,
  Pagination,
  RefreshButton,
  Select,
  Skeleton,
  type DataTableColumn,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import type { AuditAction, AuditEntity, AuditLog } from '@/lib/api';
import { MAX_PAGE_SIZE, rowsOnPage, useManualRefresh, usePagination } from '@/lib/hooks';
import { parseDateKey } from '@/lib/utils';
import { useAuditLogs, useUsers, type AuditQuery } from './api';
import { auditActionsOf, AUDIT_ENTITIES, auditEntityOf } from './audit-actions';

/**
 * The whole membership in one request, to fill the "who" filter.
 *
 * A picker is only honest when it holds every option, and an organization with
 * more members than one page holds is not what this product is for yet.
 */
const EVERY_USER = { page: 1, pageSize: MAX_PAGE_SIZE } as const;

/** The metadata is flat scalars by contract, so one line reads it all. */
function describeMetadata(metadata: AuditLog['metadata']): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

/** The picker speaks calendar days; the API takes an instant on each end. */
function dayBounds(dateKey: string): { from: string; to: string } {
  const start = parseDateKey(dateKey);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function AuditLogView() {
  const t = useTranslations('admin.audit');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const { can } = useAuth();
  const [entity, setEntity] = useState<AuditEntity | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [userId, setUserId] = useState('');
  const [day, setDay] = useState('');

  // The trail names its actors, but only a user manager can list them to filter by.
  const canListUsers = can('user:manage');
  const { data: userPage } = useUsers(EVERY_USER, canListUsers);
  const users = canListUsers ? (userPage?.data ?? []) : [];

  const entityOptions = [
    { value: '', label: t('anyEntity') },
    ...AUDIT_ENTITIES.map((value) => ({ value, label: t(`entities.${value}`) })),
  ];

  const actionOptions = [
    { value: '', label: t('anyAction') },
    ...auditActionsOf(entity).map((value) => ({ value, label: t(`actionNames.${value}`) })),
  ];

  const query = useMemo<AuditQuery>(
    () => ({
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(day ? dayBounds(day) : {}),
    }),
    [action, day, entity, userId],
  );

  const pagination = usePagination(JSON.stringify(query));
  const { data, error, isPending, isPlaceholderData, refetch } = useAuditLogs(
    query,
    pagination.params,
  );
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  // Turning a page keeps the previous one on screen, so this and not `isPending`.
  // A refresh the reader asked for shows the ghosts too, or the button reads dead.
  const isLoading = isPending || isPlaceholderData || isRefreshing;

  const logs = data?.data ?? [];
  const hasFilters = Boolean(entity || action || userId || day);

  const clearFilters = () => {
    setEntity('');
    setAction('');
    setUserId('');
    setDay('');
  };

  const chooseEntity = (value: string) => {
    const next = value as AuditEntity | '';

    setEntity(next);

    // An action belongs to one entity, so keeping one from another asks for a
    // pair no row can satisfy, and an empty table reads as broken rather than
    // as filtered.
    if (action && next && auditEntityOf(action) !== next) {
      setAction('');
    }
  };

  const chooseAction = (value: string) => {
    const next = value as AuditAction | '';

    setAction(next);

    if (next) {
      setEntity(auditEntityOf(next));
    }
  };

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: t('columns.when'),
      summary: true,
      // Without this the timestamp wraps onto four lines and the row grows tall.
      // Only a concern where it shares a row: on a phone it has one of its own.
      className: 'sm:whitespace-nowrap',
      cell: (log) => (
        <span className="text-contrast/70">{format.dateTime(new Date(log.createdAt), 'full')}</span>
      ),
    },
    {
      key: 'user',
      header: t('columns.who'),
      // Two lines, like the cell it stands in for: name over address.
      skeleton: (
        <div className="space-y-0.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
      ),
      cell: (log) =>
        log.user ? (
          <div className="min-w-0 space-y-0.5">
            <p className="text-foreground">{log.user.name}</p>
            <p className="truncate text-xs text-contrast/50">{log.user.email}</p>
          </div>
        ) : (
          <span className="text-xs text-contrast/50">{t('system')}</span>
        ),
    },
    {
      key: 'action',
      header: t('columns.action'),
      primary: true,
      // The code stays reachable on hover: it is what an API log or a support
      // question will name, and the translated wording is not.
      cell: (log) => (
        <span className="text-accent" title={log.action}>
          {t(`actionNames.${log.action}`)}
        </span>
      ),
    },
    {
      key: 'entity',
      header: t('columns.entity'),
      hideBelow: 'sm',
      skeleton: (
        <div className="space-y-0.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ),
      cell: (log) => (
        <div className="min-w-0 space-y-0.5">
          <p className="text-contrast/70">{t(`entities.${log.entity}`)}</p>
          {log.entityId && (
            <p className="truncate font-mono text-xs text-contrast/40">{log.entityId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'metadata',
      header: t('columns.detail'),
      hideBelow: 'lg',
      cell: (log) => (
        <span className="text-xs text-contrast/60">{describeMetadata(log.metadata)}</span>
      ),
    },
    {
      key: 'ipAddress',
      header: t('columns.from'),
      align: 'end',
      hideBelow: 'lg',
      skeleton: <Skeleton className="ml-auto h-5 w-24" />,
      cell: (log) => (
        <span className="font-mono text-xs text-contrast/50">
          {log.ipAddress ?? tStates('none')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Dropdowns and not free text: the trail records two dozen named
            actions, and nobody outside this codebase can guess how they are
            spelled, so a typed filter only ever returned nothing. */}
        <Select
          value={entity}
          onValueChange={chooseEntity}
          aria-label={t('entityLabel')}
          options={entityOptions}
        />
        <Select
          value={action}
          onValueChange={chooseAction}
          aria-label={t('actionLabel')}
          options={actionOptions}
        />
        {canListUsers && (
          <Select
            value={userId}
            onValueChange={setUserId}
            aria-label={t('userLabel')}
            options={[
              { value: '', label: t('anyone') },
              ...users.map((user) => ({ value: user.id, label: user.name })),
            ]}
          />
        )}
        <DatePicker value={day} onChange={setDay} placeholder={t('dateLabel')} />
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
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={logs}
            rowKey={(log) => log.id}
            isLoading={isLoading}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, data?.meta.total)}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
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
            }
          />
        </Card>
      )}

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
    </div>
  );
}
