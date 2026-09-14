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
  RefreshButton,
  Skeleton,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { InvitationsCard, InviteDialog } from '@/features/invitations';
import { describeError, type User } from '@/lib/api';
import { rowsOnPage, useManualRefresh, usePagination } from '@/lib/hooks';
import { useUpdateUser, useUsers } from './api';
import { STATUS_TONES } from './roles';
import { UserFormDialog } from './UserFormDialog';

// ---- Cell components -------------------------------------------------
// Extracted out of UsersView (not nested) so React doesn't remount them
// on every render, and so Sonar doesn't flag them as inline component
// definitions (S6478). Each receives exactly the data/callbacks it needs
// as props instead of closing over UsersView's scope.

// `useTranslations` returns a function typed to only accept the literal
// message keys of its namespace (`NamespacedMessageKeys<...>`), and its
// `values` param is overloaded per-key (sometimes strictly `undefined`),
// both narrower than this wrapper's original `string` / `Record<...>`
// signature. Since t/tRoles/tStatuses/tActions each have a different, more
// specific type, this local alias has to accept `any` for both params so
// those concrete translators stay assignable to it — the real key/values
// safety still comes from next-intl at each `t('...')` call site, not from
// this alias.
type Translator = (key: any, values?: any) => string;

function MemberCell({ user, isSelf, t }: { user: User; isSelf: boolean; t: Translator }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="font-medium text-foreground">
        {user.name}
        {isSelf && <span className="ml-2 text-xs font-normal text-contrast/50">{t('you')}</span>}
      </p>
      <p className="truncate text-xs text-contrast/60">{user.email}</p>
    </div>
  );
}

function RoleCell({ user, tRoles }: { user: User; tRoles: Translator }) {
  return <span className="text-contrast/70">{tRoles(user.role)}</span>;
}

function StatusCell({ user, tStatuses }: { user: User; tStatuses: Translator }) {
  return <Badge tone={STATUS_TONES[user.status]}>{tStatuses(user.status)}</Badge>;
}

function LastLoginCell({
  user,
  format,
  t,
}: {
  user: User;
  format: ReturnType<typeof useFormatter>;
  t: Translator;
}) {
  return (
    <span className="text-xs text-contrast/60">
      {user.lastLoginAt ? format.dateTime(new Date(user.lastLoginAt), 'full') : t('never')}
    </span>
  );
}

function ActionsCell({
  user,
  isSelf,
  t,
  tActions,
  onEdit,
  onToggleStatus,
}: {
  user: User;
  isSelf: boolean;
  t: Translator;
  tActions: Translator;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={() => onEdit(user)}>
        {tActions('edit')}
      </Button>
      {/* Closing someone's door is the reason this screen gets opened in a
          hurry, and it was two dialogs deep inside an edit form. Never on
          your own account: the API refuses it so nobody locks themselves out. */}
      {!isSelf &&
        (user.status === 'SUSPENDED' ? (
          <Button variant="secondary" size="sm" onClick={() => onToggleStatus(user)}>
            {t('reactivate')}
          </Button>
        ) : (
          <Button variant="danger-outline" size="sm" onClick={() => onToggleStatus(user)}>
            {t('suspend')}
          </Button>
        ))}
    </div>
  );
}

// ---- Skeletons ---------------------------------------------------------
// Plain JSX, not component functions, so these don't trigger S6478 — kept
// here so the columns definition below stays readable.

const memberSkeleton = (
  <div className="space-y-0.5">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-4 w-44" />
  </div>
);

const statusSkeleton = <Skeleton className="h-6 w-20" />;

const actionsSkeleton = (
  <div className="flex justify-end gap-2">
    <Skeleton className="h-9 w-16" />
    <Skeleton className="h-9 w-24" />
  </div>
);

// ---- Columns factory ----------------------------------------------------
// Building `columns` inline inside UsersView would define `cell` functions
// (which return JSX) lexically nested inside the component (S6478), even
// though they only delegate to the extracted *Cell components above. Moving
// the whole construction into a plain, non-component function — one that
// takes everything it needs as arguments — keeps every JSX-returning
// function outside UsersView's body.
interface ColumnsContext {
  currentUserId?: string;
  t: Translator;
  tRoles: Translator;
  tStatuses: Translator;
  tActions: Translator;
  format: ReturnType<typeof useFormatter>;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

function buildColumns({
  currentUserId,
  t,
  tRoles,
  tStatuses,
  tActions,
  format,
  onEdit,
  onToggleStatus,
}: ColumnsContext): DataTableColumn<User>[] {
  return [
    {
      key: 'member',
      header: t('columns.member'),
      primary: true,
      // Two lines, like the cell it stands in for: name over address.
      skeleton: memberSkeleton,
      cell: (user) => <MemberCell user={user} isSelf={user.id === currentUserId} t={t} />,
    },
    {
      key: 'role',
      header: t('columns.role'),
      summary: true,
      cell: (user) => <RoleCell user={user} tRoles={tRoles} />,
    },
    {
      key: 'status',
      header: t('columns.status'),
      skeleton: statusSkeleton,
      cell: (user) => <StatusCell user={user} tStatuses={tStatuses} />,
    },
    {
      key: 'lastLoginAt',
      header: t('columns.lastLogin'),
      hideBelow: 'lg',
      cell: (user) => <LastLoginCell user={user} format={format} t={t} />,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      bare: true,
      // Two buttons, and they are what sets this row's height.
      skeleton: actionsSkeleton,
      cell: (user) => (
        <ActionsCell
          user={user}
          isSelf={user.id === currentUserId}
          t={t}
          tActions={tActions}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      ),
    },
  ];
}

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
  const { data, error, isPending, isPlaceholderData, refetch } = useUsers(pagination.params);
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  // Turning a page keeps the previous one on screen, so this and not `isPending`.
  // A refresh the reader asked for shows the ghosts too, or the button reads dead.
  const isLoading = isPending || isPlaceholderData || isRefreshing;
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

  const columns = buildColumns({
    currentUserId: currentUser?.id,
    t,
    tRoles,
    tStatuses,
    tActions,
    format,
    onEdit: setEditing,
    onToggleStatus: setSuspending,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
          <Button size="lg" className="hidden sm:inline-flex" onClick={() => setIsInviteOpen(true)}>
            {t('new')}
          </Button>
        </div>
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
