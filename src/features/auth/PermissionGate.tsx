'use client';

import { useTranslations } from 'next-intl';
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
  title,
  children,
}: {
  permission: Permission;
  /** A sentence naming what is out of reach; the generic one otherwise. */
  title?: string;
  children: ReactNode;
}) {
  const t = useTranslations('auth.permissionGate');
  const { can } = useAuth();

  if (!can(permission)) {
    return <EmptyState title={title ?? t('title')} description={t('description')} />;
  }

  return <>{children}</>;
}
