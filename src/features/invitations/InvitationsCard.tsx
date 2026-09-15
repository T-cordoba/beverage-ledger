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
  Pagination,
  RefreshButton,
  Skeleton,
  useNotify,
  type BadgeProps,
  type DataTableColumn,
} from '@/components/ui';
import { describeError, type Invitation } from '@/lib/api';
import { rowsOnPage, useManualRefresh, usePagination } from '@/lib/hooks';
import { useInvitations, useRevokeInvitation } from './api';

type InvitationState = 'pending' | 'accepted' | 'revoked' | 'expired';

const STATE_TONES: Record<InvitationState, BadgeProps['tone']> = {
  pending: 'accent',
  accepted: 'success',
  revoked: 'danger',
  expired: 'warning',
};

function stateOf(invitation: Invitation, now: number): InvitationState {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.revokedAt) return 'revoked';
  if (new Date(invitation.expiresAt).getTime() <= now) return 'expired';
  return 'pending';
}

// === CELLS COMO COMPONENTES EXTERNOS ===
function EmailCell({ invitation }: Readonly<{ invitation: Invitation }>) {
  return <span className="font-medium text-foreground">{invitation.email}</span>;
}

function RoleCell({
  invitation,
  tRoles,
}: Readonly<{
  invitation: Invitation;
  tRoles: ReturnType<typeof useTranslations>;
}>) {
  return <span className="text-contrast/70">{tRoles(invitation.role)}</span>;
}

function StateCell({
  invitation,
  now,
  t,
}: Readonly<{
  invitation: Invitation;
  now: number;
  t: ReturnType<typeof useTranslations>;
}>) {
  const state = stateOf(invitation, now);
  return <Badge tone={STATE_TONES[state]}>{t(`states.${state}`)}</Badge>;
}

function ExpiresCell({
  invitation,
  format,
}: Readonly<{
  invitation: Invitation;
  format: ReturnType<typeof useFormatter>;
}>) {
  return (
    <span className="text-contrast/70">
      {format.dateTime(new Date(invitation.expiresAt), 'short')}
    </span>
  );
}

function InvitedByCell({ invitation }: Readonly<{ invitation: Invitation }>) {
  return <span className="text-contrast/70">{invitation.invitedByName}</span>;
}

function ActionsCell({
  invitation,
  now,
  t,
  setRevoking,
}: Readonly<{
  invitation: Invitation;
  now: number;
  t: ReturnType<typeof useTranslations>;
  setRevoking: (inv: Invitation) => void;
}>) {
  return stateOf(invitation, now) === 'pending' ? (
    <Button variant="danger-outline" size="sm" onClick={() => setRevoking(invitation)}>
      {t('revoke')}
    </Button>
  ) : null;
}

// === COMPONENTE PRINCIPAL ===
export function InvitationsCard() {
  const t = useTranslations('admin.invitations');
  const tRoles = useTranslations('admin.roles');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const pagination = usePagination('invitations');
  const { data, error, isPending, isPlaceholderData, refetch } = useInvitations(pagination.params);
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  const isLoading = isPending || isPlaceholderData || isRefreshing;
  const revoke = useRevokeInvitation();
  const notify = useNotify();

  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const now = Date.now();
  const invitations = data?.data ?? [];

  const confirmRevoke = async () => {
    if (!revoking) return;
    const invitation = revoking;
    setRevoking(null);
    try {
      await revoke.mutateAsync(invitation.id);
      notify('success', t('revoked'), t('revokedDescription', { email: invitation.email }));
    } catch (cause) {
      notify('error', t('revokeFailed'), describeError(cause, tStates('tryAgain')));
    }
  };

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: 'email',
      header: t('columns.email'),
      primary: true,
      cell: (inv) => <EmailCell invitation={inv} />,
    },
    {
      key: 'role',
      header: t('columns.role'),
      cell: (inv) => <RoleCell invitation={inv} tRoles={tRoles} />,
    },
    {
      key: 'state',
      header: t('columns.state'),
      summary: true,
      skeleton: <Skeleton className="h-6 w-20" />,
      cell: (inv) => <StateCell invitation={inv} now={now} t={t} />,
    },
    {
      key: 'expiresAt',
      header: t('columns.expires'),
      hideBelow: 'sm',
      cell: (inv) => <ExpiresCell invitation={inv} format={format} />,
    },
    {
      key: 'invitedBy',
      header: t('columns.invitedBy'),
      hideBelow: 'md',
      cell: (inv) => <InvitedByCell invitation={inv} />,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      bare: true,
      skeleton: <Skeleton className="ml-auto h-9 w-20" />,
      cell: (inv) => <ActionsCell invitation={inv} now={now} t={t} setRevoking={setRevoking} />,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-light text-foreground">{t('title')}</h2>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={t('title')}
            columns={columns}
            rows={invitations}
            rowKey={(inv) => inv.id}
            isLoading={isLoading}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, data?.meta.total)}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={t('empty')} description={t('emptyDescription')} />}
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

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        tone="danger"
        title={t('revokeTitle', { email: revoking?.email ?? '' })}
        description={t('revokeDescription')}
        cancelLabel={tActions('cancel')}
        confirmLabel={t('revoke')}
        onConfirm={() => void confirmRevoke()}
        isConfirming={revoke.isPending}
      />
    </section>
  );
}
