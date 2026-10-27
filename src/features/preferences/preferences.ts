export const THEMES = ['light', 'dark', 'system'] as const;
export const CONTRASTS = ['normal', 'high'] as const;
export const TEXT_SCALES = ['sm', 'md', 'lg', 'xl'] as const;

export type Theme = (typeof THEMES)[number];
export type Contrast = (typeof CONTRASTS)[number];
export type TextScale = (typeof TEXT_SCALES)[number];

export interface Preferences {
  theme: Theme;
  contrast: Contrast;
  textScale: TextScale;
  /** Dashboard cards in the order the user wants them; ids from `DASHBOARD_WIDGETS`. */
  dashboardOrder: string[];
  dashboardHidden: string[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  contrast: 'normal',
  textScale: 'md',
  dashboardOrder: [],
  dashboardHidden: [],
};

export const PREFERENCES_KEY = 'beverage-ledger:preferences';

/**
 * Written onto <html> as data attributes, which tokens.css keys the palette and
 * the root font size off. Kept in sync with `PREFERENCES_SCRIPT` below.
 */
const systemTheme = () =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export function applyPreferences({ theme, contrast, textScale }: Preferences) {
  const root = document.documentElement;

  root.dataset.theme = theme === 'system' ? systemTheme() : theme;
  root.dataset.contrast = contrast;
  root.dataset.textScale = textScale;
}

/**
 * Runs in <head> before the first paint. Applying the theme from React would
 * flash the dark palette on every load for anyone who chose light. Plain ES5 on
 * purpose: it runs before any bundle, untranspiled.
 */
export const PREFERENCES_SCRIPT = `(function () {
  try {
    var p = JSON.parse(localStorage.getItem('${PREFERENCES_KEY}') || '{}');
    var theme = p.theme || '${DEFAULT_PREFERENCES.theme}';
    if (theme === 'system') {
      theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.contrast = p.contrast || '${DEFAULT_PREFERENCES.contrast}';
    root.dataset.textScale = p.textScale || '${DEFAULT_PREFERENCES.textScale}';
  } catch (e) {}
})();`;
