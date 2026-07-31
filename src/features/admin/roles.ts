import type { UserRole, UserStatus } from '@/lib/api';

/**
 * What an administrator may hand out, in the order the picker offers them.
 *
 * PLATFORM_ADMIN sits above the organization and the API rejects it, so it is
 * labelled in `admin.roles` — an existing one still has to display — but never
 * offered here.
 */
export const ASSIGNABLE_ROLES: UserRole[] = ['OPERATOR', 'MANAGER', 'ORG_ADMIN'];

export const STATUS_TONES = {
  ACTIVE: 'success',
  INVITED: 'info',
  SUSPENDED: 'danger',
} as const satisfies Record<UserStatus, 'success' | 'info' | 'danger'>;

/** Nobody is deleted: suspending is the way out, and it keeps the audit trail intact. */
export const ASSIGNABLE_STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED'];
