'use client';

import { useFormatter, useTranslations } from 'next-intl';

/**
 * The ledger stores singles; a cellar counts cases. Returns the case view when
 * there is one, and null for products sold by the single.
 *
 * A hook rather than a function because the phrase is built from a plural noun
 * and a formatted number, and both depend on the active locale.
 */
export function useDescribeCases() {
  const t = useTranslations('common.units');
  const format = useFormatter();

  return (quantityBase: number, caseSize: number): string | null => {
    if (caseSize <= 1 || quantityBase <= 0) return null;

    const cases = Math.floor(quantityBase / caseSize);
    const singles = quantityBase % caseSize;

    if (cases === 0) return null;

    const casePart = `${format.number(cases)} ${t('case', { count: cases })}`;

    return singles === 0
      ? casePart
      : `${casePart} + ${format.number(singles)} ${t('bottle', { count: singles })}`;
  };
}
