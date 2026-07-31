'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Select } from '@/components/ui';
import { setLocale } from './actions';
import { isLocale, LOCALE_LABELS, LOCALES } from './config';

const options = LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] }));

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(value: string) {
    if (!isLocale(value) || value === locale) return;

    startTransition(async () => {
      await setLocale(value);
      // The messages are handed down by the root layout, so the new language
      // only reaches the tree once the server renders it again.
      router.refresh();
    });
  }

  return (
    <Select
      value={locale}
      onValueChange={change}
      options={options}
      size="sm"
      disabled={isPending}
      aria-label={t('label')}
      className={className}
    />
  );
}
