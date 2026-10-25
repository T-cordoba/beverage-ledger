/** Dashboard cards in their default order. A user can reorder and hide them. */
export const DASHBOARD_WIDGETS = ['actions', 'summary', 'activity', 'lowStock', 'recent'] as const;

export type DashboardWidget = (typeof DASHBOARD_WIDGETS)[number];

/** Half a row on a wide screen, so two of them sit side by side; the rest span it. */
export const HALF_WIDTH_WIDGETS: readonly DashboardWidget[] = ['activity', 'lowStock'];
