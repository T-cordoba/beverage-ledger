import type { UserRole, UserStatus } from '@/lib/api';

export const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'Platform admin',
  ORG_ADMIN: 'Administrator',
  MANAGER: 'Manager',
  OPERATOR: 'Operator',
};

/**
 * What an administrator may hand out. PLATFORM_ADMIN sits above the organization
 * and the API rejects it, so it is labelled — an existing one still has to
 * display — but never offered.
 */
export const ASSIGNABLE_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'OPERATOR',
    label: ROLE_LABELS.OPERATOR,
    description: 'Registers dispatches and reads stock and history.',
  },
  {
    value: 'MANAGER',
    label: ROLE_LABELS.MANAGER,
    description: 'Also inbounds, adjustments, voids and reports.',
  },
  {
    value: 'ORG_ADMIN',
    label: ROLE_LABELS.ORG_ADMIN,
    description: 'Also the catalogue, users, branding and the audit log.',
  },
];

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
};

export const STATUS_TONES = {
  ACTIVE: 'success',
  INVITED: 'info',
  SUSPENDED: 'danger',
} as const satisfies Record<UserStatus, 'success' | 'info' | 'danger'>;

/** Nobody is deleted: suspending is the way out, and it keeps the audit trail intact. */
export const ASSIGNABLE_STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
  { value: 'SUSPENDED', label: STATUS_LABELS.SUSPENDED },
];
