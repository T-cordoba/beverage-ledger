import type { Permission } from '@/lib/api';

export const ROUTES = {
  home: '/',
  signIn: '/login',
  signUp: '/register',
  oauthCallback: '/auth/callback',
  movements: '/movements',
  newMovement: '/movements/new',
  movement: (id: string) => `/movements/${id}`,
  reports: '/reports',
} as const;

/** Read back by the login page to return the user where they were headed. */
export const RETURN_TO_PARAM = 'next';

export function signInPath(returnTo?: string): string {
  if (!returnTo || returnTo === ROUTES.signIn) return ROUTES.signIn;
  return `${ROUTES.signIn}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}

/**
 * An open redirect is one absolute URL away, so only in-app paths are honoured.
 */
export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return ROUTES.movements;
  return value;
}

export interface NavigationItem {
  href: string;
  label: string;
  /** Hidden when the session does not carry it. The API still enforces it. */
  permission?: Permission;
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { href: ROUTES.movements, label: 'Movements', permission: 'movement:read' },
  { href: ROUTES.reports, label: 'Reports', permission: 'report:read' },
];
