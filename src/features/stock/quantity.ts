import { formatNumber, pluralize } from '@/lib/utils';

/**
 * The ledger stores singles; a cellar counts cases. Shows the case view when
 * there is one, and nothing at all for products sold by the single.
 */
export function describeCases(quantityBase: number, caseSize: number): string | null {
  if (caseSize <= 1 || quantityBase <= 0) return null;

  const cases = Math.floor(quantityBase / caseSize);
  const singles = quantityBase % caseSize;

  if (cases === 0) return null;

  const casePart = `${formatNumber(cases)} ${pluralize(cases, 'case')}`;

  return singles === 0
    ? casePart
    : `${casePart} + ${formatNumber(singles)} ${pluralize(singles, 'bottle')}`;
}
