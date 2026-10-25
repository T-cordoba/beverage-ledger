'use client';

import { DASHBOARD_WIDGETS, type DashboardWidget } from '@/config/dashboard';
import { usePreferences } from '@/features/preferences';

const isWidget = (id: string): id is DashboardWidget =>
  (DASHBOARD_WIDGETS as readonly string[]).includes(id);

/**
 * The user's order and visibility, read over the default. A card added in a
 * later release is not in anyone's saved order, so it is appended rather than
 * lost.
 */
export function useDashboardLayout() {
  const { preferences, update } = usePreferences();

  const saved = preferences.dashboardOrder.filter(isWidget);
  const order = [...saved, ...DASHBOARD_WIDGETS.filter((id) => !saved.includes(id))];
  const hidden = new Set(preferences.dashboardHidden.filter(isWidget));

  /**
   * Swaps with the nearest neighbour in `among`, the cards this session can see:
   * swapping with one hidden by a permission would look like nothing happened.
   */
  const move = (id: DashboardWidget, offset: -1 | 1, among: readonly DashboardWidget[]) => {
    const visible = order.filter((widget) => among.includes(widget));
    const neighbour = visible[visible.indexOf(id) + offset];
    if (!neighbour) return;

    const next = [...order];
    const [from, to] = [next.indexOf(id), next.indexOf(neighbour)];
    [next[from], next[to]] = [next[to], next[from]];
    update({ dashboardOrder: next });
  };

  const toggle = (id: DashboardWidget) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update({ dashboardHidden: [...next] });
  };

  const reset = () => update({ dashboardOrder: [], dashboardHidden: [] });

  return { order, hidden, move, toggle, reset };
}
