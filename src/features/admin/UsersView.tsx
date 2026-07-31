'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Pagination,
  type DataTableColumn,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import type { User } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import { useUsers } from './api';
import { STATUS_TONES } from './roles';
import { UserFormDialog } from './UserFormDialog';

export function UsersView() {
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('admin.roles');
  const tStatuses = useTranslations('admin.statuses');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const { user: currentUser } = useAuth();
  const [editing, setEditing] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // No filters on this list, so the key never changes and the page never resets.
  const pagination = usePagination('users');
  const { data, error, isPending } = useUsers(pagination);
  const users = data?.data ?? [];

  const openForm = (user: User | null) => {
    setEditing(user);
    setIsFormOpen(true);
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: 'member',
      header: t('columns.member'),
      cell: (user) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">
            {user.name}
            {user.id === currentUser?.id && (
              <span className="ml-2 text-xs font-normal text-contrast/50">{t('you')}</span>
            )}
          </p>
          <p className="truncate text-xs text-contrast/60">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('columns.role'),
      cell: (user) => <span className="text-contrast/70">{tRoles(user.role)}</span>,
    },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (user) => <Badge tone={STATUS_TONES[user.status]}>{tStatuses(user.status)}</Badge>,
    },
    {
      key: 'lastLoginAt',
      header: t('columns.lastLogin'),
      hideBelow: 'lg',
      cell: (user) => (
        <span className="text-xs text-contrast/60">
          {user.lastLoginAt ? format.dateTime(new Date(user.lastLoginAt), 'full') : t('never')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (user) => (
        <Button variant="secondary" size="sm" onClick={() => openForm(user)}>
          {tActions('edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          {t('new')}
        </Button>
      </header>

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={users}
            rowKey={(user) => user.id}
            isLoading={isPending}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={t('empty')} />}
          />
        </Card>
      )}

      {data && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={data.meta.total}
          pageCount={data.meta.pageCount}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}

      {/* Keyed so the form seeds itself from whichever member is being edited. */}
      <UserFormDialog
        key={editing?.id ?? 'new'}
        user={editing}
        isSelf={editing?.id === currentUser?.id}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
