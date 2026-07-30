import type { MovementType, Permission } from '@/lib/api';

export const ROUTES = {
  home: '/',
  signIn: '/login',
  signUp: '/register',
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

export interface NavigationItem {
  href: string;
  label: string;
  /** Hidden unless the session carries at least one. The API still enforces it. */
  permissions?: Permission[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { href: ROUTES.dashboard, label: 'Dashboard', permissions: ['stock:read'] },
  { href: ROUTES.stock, label: 'Stock', permissions: ['stock:read'] },
  { href: ROUTES.movements, label: 'Movements', permissions: ['movement:read'] },
  { href: ROUTES.catalog, label: 'Catalogue' },
  { href: ROUTES.reports, label: 'Reports', permissions: ['report:read'] },
  {
    href: ROUTES.admin,
    label: 'Admin',
    permissions: ['user:manage', 'catalog:manage', 'organization:manage', 'audit:read'],
  },
];

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { href: ROUTES.adminUsers, label: 'Users', permissions: ['user:manage'] },
  { href: ROUTES.adminCategories, label: 'Categories', permissions: ['catalog:manage'] },
  { href: ROUTES.adminBrands, label: 'Brands', permissions: ['catalog:manage'] },
  { href: ROUTES.adminLocations, label: 'Locations', permissions: ['catalog:manage'] },
  { href: ROUTES.adminOrganization, label: 'Organization', permissions: ['organization:manage'] },
  { href: ROUTES.adminAudit, label: 'Audit log', permissions: ['audit:read'] },
];

export function visibleNavigation(
  items: NavigationItem[],
  can: (permission: Permission) => boolean,
): NavigationItem[] {
  return items.filter((item) => !item.permissions || item.permissions.some(can));
}
