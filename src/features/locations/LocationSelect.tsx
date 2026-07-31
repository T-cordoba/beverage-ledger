'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui';
import { useLocations } from './api';

interface LocationSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  'aria-describedby'?: string;
  'aria-label'?: string;
  /** Rendered first and selected by nothing: for a filter that means "everywhere". */
  anyLabel?: string;
  /** Hidden from the options, so a transfer cannot pick its own origin. */
  excludeId?: string;
}

/**
 * The picker every location choice goes through.
 *
 * An empty value means the default location, which is what the API resolves when
 * a movement names none — so the placeholder is not a missing answer.
 */
export function LocationSelect({
  id,
  value,
  onValueChange,
  anyLabel,
  excludeId,
  ...aria
}: LocationSelectProps) {
  const t = useTranslations('locations.select');
  const tStates = useTranslations('common.states');
  const { data, isPending } = useLocations();

  const locations = (data?.data ?? []).filter((location) => location.id !== excludeId);
  const fallback = anyLabel ?? t('default');

  return (
    <Select
      id={id}
      value={value}
      onValueChange={onValueChange}
      disabled={isPending}
      {...aria}
      options={[
        { value: '', label: isPending ? tStates('loading') : fallback },
        ...locations.map((location) => ({
          value: location.id,
          label: location.isDefault ? t('isDefault', { name: location.name }) : location.name,
        })),
      ]}
    />
  );
}
