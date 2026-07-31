'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FloatingAction,
  Pagination,
  Skeleton,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { InvitationsCard, InviteDialog } from '@/features/invitations';
import { describeError, type User } from '@/lib/api';
import { rowsOnPage, usePagination } from '@/lib/hooks';
import { useUpdateUser, useUsers } from './api';
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
  const [suspending, setSuspending] = useState<User | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const notify = useNotify();
  const update = useUpdateUser();

  // No filters on this list, so the key never changes and the page never resets.
  const pagination = usePagination('users');
  const { data, error, isPending, isPlaceholderData } = useUsers(pagination.params);
  // Turning a page keeps the previous one on screen, so this and not `isPending`.
  const isLoading = isPending || isPlaceholderData;
  const users = data?.data ?? [];

  const isReactivating = suspending?.status === 'SUSPENDED';

  const changeStatus = async (user: User) => {
    const status = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    try {
      await update.mutateAsync({ id: user.id, input: { status } });
      setSuspending(null);
      notify(
        'success',
        status === 'ACTIVE' ? t('reactivatedTitle') : t('suspendedTitle'),
        status === 'ACTIVE'
          ? t('reactivatedDescription', { name: user.name })
          : t('suspendedDescription', { name: user.name }),
      );
    } catch (cause) {
      notify('error', t('statusFailed'), describeError(cause, tStates('tryAgain')));
    }
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: 'member',
      header: t('columns.member'),
      // Two lines, like the cell it stands in for: name over address.
      skeleton: (
        <div className="space-y-0.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
      ),
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
      skeleton: <Skeleton className="h-6 w-20" />,
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
      // Two buttons, and they are what sets this row's height.
      skeleton: (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-24" />
        </div>
      ),
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(user)}>
            {tActions('edit')}
          </Button>
          {/* Closing someone's door is the reason this screen gets opened in a
              hurry, and it was two dialogs deep inside an edit form. Never on
              your own account: the API refuses it so nobody locks themselves out. */}
          {user.id !== currentUser?.id &&
            (user.status === 'SUSPENDED' ? (
              <Button variant="secondary" size="sm" onClick={() => setSuspending(user)}>
                {t('reactivate')}
              </Button>
            ) : (
              <Button variant="danger-outline" size="sm" onClick={() => setSuspending(user)}>
                {t('suspend')}
              </Button>
            ))}
        </div>
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
        <Button size="lg" className="hidden sm:inline-flex" onClick={() => setIsInviteOpen(true)}>
          {t('new')}
        </Button>
      </header>

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={users}
            rowKey={(user) => user.id}
            isLoading={isLoading}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, data?.meta.total)}
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
          isLoading={isLoading}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}

      <FloatingAction
        label={t('new')}
        items={[{ label: t('new'), onClick: () => setIsInviteOpen(true) }]}
      />

      <InvitationsCard />

      {/* Keyed and mounted only while editing, so the form always seeds itself
          from the member it was opened on. */}
      {editing && (
        <UserFormDialog
          key={editing.id}
          user={editing}
          isSelf={editing.id === currentUser?.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}

      <InviteDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />

      <ConfirmDialog
        open={suspending !== null}
        onOpenChange={(open) => !open && setSuspending(null)}
        tone={isReactivating ? 'accent' : 'danger'}
        title={
          isReactivating
            ? t('reactivateTitle', { name: suspending?.name ?? '' })
            : t('suspendTitle', { name: suspending?.name ?? '' })
        }
        description={isReactivating ? t('reactivateDescription') : t('suspendDescription')}
        cancelLabel={tActions('cancel')}
        confirmLabel={isReactivating ? t('reactivate') : t('suspend')}
        isConfirming={update.isPending}
        onConfirm={() => suspending && void changeStatus(suspending)}
      />
    </div>
  );
}
