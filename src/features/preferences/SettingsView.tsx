'use client';

import { useTranslations } from 'next-intl';
import { Card, SegmentedControl } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CONTRASTS, TEXT_SCALES, THEMES, type Theme } from './preferences';
import { usePreferences } from './usePreferences';

const SCALE_PERCENT = { sm: 87.5, md: 100, lg: 112.5, xl: 125 } as const;

/** A miniature of the app shell, painted in whichever palette `theme` names. */
function ThemeMiniature({ theme }: Readonly<{ theme: 'light' | 'dark' }>) {
  return (
    <div data-theme={theme} className="flex h-full gap-2 bg-background p-3">
      <div className="w-1/5 space-y-1.5 rounded-md bg-surface p-1.5">
        <div className="h-1.5 w-3/4 rounded-full bg-accent" />
        <div className="h-1.5 rounded-full bg-border" />
        <div className="h-1.5 rounded-full bg-border" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2 w-2/3 rounded-full bg-border" />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-6 rounded-md border border-border bg-surface p-1">
            <div className="h-1 w-3/4 rounded-full bg-accent" />
          </div>
          <div className="h-6 rounded-md border border-border bg-surface" />
          <div className="h-6 rounded-md border border-border bg-surface" />
        </div>
        <div className="h-5 rounded-md border border-border bg-surface" />
      </div>
    </div>
  );
}

function ThemeOption({
  theme,
  label,
  checked,
  onSelect,
}: Readonly<{ theme: Theme; label: string; checked: boolean; onSelect: () => void }>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/40',
      )}
    >
      <div className="h-24">
        {theme === 'system' ? (
          // Half and half: what "follow the device" can turn out to be.
          <div className="grid h-full grid-cols-2">
            <ThemeMiniature theme="light" />
            <ThemeMiniature theme="dark" />
          </div>
        ) : (
          <ThemeMiniature theme={theme} />
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          aria-hidden
          className={cn(
            'h-4 w-4 rounded-full border-2',
            checked ? 'border-accent bg-accent' : 'border-border',
          )}
        />
      </div>
    </button>
  );
}

/** Per-device preferences: how the app looks and reads on this screen. */
export function SettingsView() {
  const t = useTranslations('settings');
  const { preferences, update } = usePreferences();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
      </header>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t('theme.title')}</h2>
          <p className="text-sm text-contrast/60">{t('theme.description')}</p>
        </div>
        <div role="radiogroup" aria-label={t('theme.title')} className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemeOption
              key={theme}
              theme={theme}
              label={t(`theme.options.${theme}`)}
              checked={preferences.theme === theme}
              onSelect={() => update({ theme })}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t('contrast.title')}</h2>
          <p className="text-sm text-contrast/60">{t('contrast.description')}</p>
        </div>
        <SegmentedControl
          label={t('contrast.title')}
          value={preferences.contrast}
          onChange={(contrast) => update({ contrast })}
          options={CONTRASTS.map((value) => ({ value, label: t(`contrast.options.${value}`) }))}
          className="justify-start"
        />
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t('textScale.title')}</h2>
          <p className="text-sm text-contrast/60">{t('textScale.description')}</p>
        </div>
        <SegmentedControl
          label={t('textScale.title')}
          value={preferences.textScale}
          onChange={(textScale) => update({ textScale })}
          options={TEXT_SCALES.map((value) => ({ value, label: t(`textScale.options.${value}`) }))}
          className="justify-start"
        />
        <div className="space-y-2 rounded-xl border border-border bg-background/50 p-4">
          <p className="text-xs uppercase tracking-wider text-contrast/50">
            {t('textScale.preview', { percent: SCALE_PERCENT[preferences.textScale] })}
          </p>
          <p className="text-base text-foreground">{t('textScale.sample')}</p>
        </div>
      </Card>
    </div>
  );
}
