'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import type { Permission } from '@/lib/api';
import { useAuth } from './auth-context';

/**
 * Keeps a section from rendering without the permission it needs.
 *
 * Around the view rather than inside it, so the queries never fire and the user
 * gets a sentence instead of a wall of failed requests. This hides what cannot
 * be used; the API is what actually enforces it.
 */
export function PermissionGate({
  permission,
  title = 'You do not have access to this section.',
  children,
}: {
  permission: Permission;
  title?: string;
  children: ReactNode;
}) {
  const { can } = useAuth();

  if (!can(permission)) {
    return (
      <EmptyState
        title={title}
        description="Ask an administrator for the permission if you need it."
      />
    );
  }

  return <>{children}</>;
}
