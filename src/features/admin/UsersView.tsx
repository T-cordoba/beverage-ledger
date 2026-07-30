'use client';

import { useState } from 'react';
import { Badge, Button, Card, DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { useAuth } from '@/features/auth';
import type { User } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useUsers } from './api';
import { ROLE_LABELS, STATUS_LABELS, STATUS_TONES } from './roles';
import { UserFormDialog } from './UserFormDialog';

export function UsersView() {
  const { user: currentUser } = useAuth();
  const [editing, setEditing] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useUsers();
  const users = data?.pages.flatMap((page) => page.data) ?? [];

  const openForm = (user: User | null) => {
    setEditing(user);
    setIsFormOpen(true);
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: 'member',
      header: 'Member',
      cell: (user) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">
            {user.name}
            {user.id === currentUser?.id && (
              <span className="ml-2 text-xs font-normal text-contrast/50">you</span>
            )}
          </p>
          <p className="truncate text-xs text-contrast/60">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => <span className="text-contrast/70">{ROLE_LABELS[user.role]}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => <Badge tone={STATUS_TONES[user.status]}>{STATUS_LABELS[user.status]}</Badge>,
    },
    {
      key: 'lastLoginAt',
      header: 'Last sign-in',
      hideBelow: 'lg',
      cell: (user) => (
        <span className="text-xs text-contrast/60">
          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      cell: (user) => (
        <Button variant="secondary" size="sm" onClick={() => openForm(user)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">Users</h1>
          <p className="text-sm text-contrast/60">
            Who may do what. Segregation of duties is the point: whoever moves the stock is not who
            adjusts the numbers behind it.
          </p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          New member
        </Button>
      </header>

      {error ? (
        <EmptyState
          title="The members could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption="Members of the organization"
            columns={columns}
            rows={users}
            rowKey={(user) => user.id}
            isLoading={isPending}
            loadingLabel="Loading members"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title="No members yet." />}
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
