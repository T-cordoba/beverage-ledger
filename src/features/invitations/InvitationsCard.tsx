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

/**
 * Four states out of three nullable columns: the API stores what happened, not a
 * label, so expiry is a comparison rather than a stored word that would go stale
 * the moment the clock passed it.
 */
function stateOf(invitation: Invitation, now: number): InvitationState {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.revokedAt) return 'revoked';
  if (new Date(invitation.expiresAt).getTime() <= now) return 'expired';
  return 'pending';
}

export function InvitationsCard() {
  const t = useTranslations('admin.invitations');
  const tRoles = useTranslations('admin.roles');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const pagination = usePagination('invitations');
  const { data, error, isPending, isPlaceholderData, refetch } = useInvitations(pagination.params);
  // Turning a page keeps the previous one on screen, so this and not `isPending`.
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  const isLoading = isPending || isPlaceholderData || isRefreshing;
  const revoke = useRevokeInvitation();
  const notify = useNotify();

  const [revoking, setRevoking] = useState<Invitation | null>(null);

  // One reading for the whole render, so two rows cannot disagree about "now".
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
      cell: (invitation) => <span className="font-medium text-foreground">{invitation.email}</span>,
    },
    {
      key: 'role',
      header: t('columns.role'),
      cell: (invitation) => <span className="text-contrast/70">{tRoles(invitation.role)}</span>,
    },
    {
      key: 'state',
      header: t('columns.state'),
      summary: true,
      skeleton: <Skeleton className="h-6 w-20" />,
      cell: (invitation) => {
        const state = stateOf(invitation, now);
        return <Badge tone={STATE_TONES[state]}>{t(`states.${state}`)}</Badge>;
      },
    },
    {
      key: 'expiresAt',
      header: t('columns.expires'),
      hideBelow: 'sm',
      cell: (invitation) => (
        <span className="text-contrast/70">
          {format.dateTime(new Date(invitation.expiresAt), 'short')}
        </span>
      ),
    },
    {
      key: 'invitedBy',
      header: t('columns.invitedBy'),
      hideBelow: 'md',
      cell: (invitation) => <span className="text-contrast/70">{invitation.invitedByName}</span>,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      bare: true,
      // The revoke button is what sets this row's height.
      skeleton: <Skeleton className="ml-auto h-9 w-20" />,
      cell: (invitation) =>
        stateOf(invitation, now) === 'pending' ? (
          <Button variant="danger-outline" size="sm" onClick={() => setRevoking(invitation)}>
            {t('revoke')}
          </Button>
        ) : null,
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
            rowKey={(invitation) => invitation.id}
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
