import type { Messages } from 'next-intl';
import type { MovementType, Permission } from '@/lib/api';

export const ROUTES = {
  home: '/',
  signIn: '/login',
  /** The token comes from the invitation link; there is no page without one. */
  acceptInvite: (token: string) => `/invite/${token}`,
  oauthCallback: '/auth/callback',
  dashboard: '/dashboard',
  stock: '/stock',
  productStock: (productId: string) => `/stock/${productId}`,
  movements: '/movements',
  /** One route per type: the copy, the permission and the rules differ on each. */
  newMovement: (type: MovementType) => `/movements/new/${type.toLowerCase()}`,
  movement: (id: string) => `/movements/${id}`,
  reports: '/reports',
  catalog: '/catalog',
  /** Out of MAIN_NAVIGATION on purpose: it hangs off the account menu. */
  profile: '/profile',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminCategories: '/admin/categories',
  adminBrands: '/admin/brands',
  adminLocations: '/admin/locations',
  adminOrganization: '/admin/organization',
  adminAudit: '/admin/audit',
} as const;

/**
 * In-page anchors of the landing, so its nav, its footer and its sections agree
 * on the ids. Here rather than next to the nav because a server component reads
 * it too, and only functions cross a 'use client' boundary intact.
 */
export const MARKETING_SECTIONS = ['features', 'how', 'faq'] as const;

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
  if (!value || !value.startsWith('/') || value.startsWith('//')) return ROUTES.dashboard;
  return value;
}

/** Typed against the catalogue, so a renamed message breaks the build here. */
export type NavigationLabel = keyof Messages['nav']['items'];

export interface NavigationItem {
  href: string;
  label: NavigationLabel;
  /** Hidden unless the session carries at least one. The API still enforces it. */
  permissions?: Permission[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { href: ROUTES.dashboard, label: 'dashboard', permissions: ['stock:read'] },
  { href: ROUTES.stock, label: 'stock', permissions: ['stock:read'] },
  { href: ROUTES.movements, label: 'movements', permissions: ['movement:read'] },
  { href: ROUTES.catalog, label: 'catalog' },
  { href: ROUTES.reports, label: 'reports', permissions: ['report:read'] },
  {
    href: ROUTES.admin,
    label: 'admin',
    permissions: ['user:manage', 'catalog:manage', 'organization:manage', 'audit:read'],
  },
];

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { href: ROUTES.adminUsers, label: 'adminUsers', permissions: ['user:manage'] },
  { href: ROUTES.adminCategories, label: 'adminCategories', permissions: ['catalog:manage'] },
  { href: ROUTES.adminBrands, label: 'adminBrands', permissions: ['catalog:manage'] },
  { href: ROUTES.adminLocations, label: 'adminLocations', permissions: ['catalog:manage'] },
  {
    href: ROUTES.adminOrganization,
    label: 'adminOrganization',
    permissions: ['organization:manage'],
  },
  { href: ROUTES.adminAudit, label: 'adminAudit', permissions: ['audit:read'] },
];

export function visibleNavigation(
  items: NavigationItem[],
  can: (permission: Permission) => boolean,
): NavigationItem[] {
  return items.filter((item) => !item.permissions || item.permissions.some(can));
}
