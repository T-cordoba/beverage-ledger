'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@/components/ui';
import { isLocale, LOCALE_LABELS, LOCALES } from './config';
import { useLocaleTransition } from './LocaleTransition';

const options = LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] }));

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const locale = useLocale();
  const { isChanging, change } = useLocaleTransition();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isLocale(value) && value !== locale) change(value);
      }}
      options={options}
      size="sm"
      disabled={isChanging}
      aria-label={t('label')}
      className={className}
    />
  );
}
