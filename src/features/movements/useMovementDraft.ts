'use client';

import { useCallback, useMemo, useState } from 'react';
import type { MovementLineInput, MovementUnit, Product } from '@/lib/api';

export interface DraftLine {
  product: Product;
  BOTTLE: number;
  CASE: number;
}

export const EMPTY_LINE = { BOTTLE: 0, CASE: 0 } as const;

export interface MovementDraft {
  lines: DraftLine[];
  quantityOf: (productId: string) => { BOTTLE: number; CASE: number };
  adjust: (product: Product, unit: MovementUnit, delta: number) => void;
  clear: () => void;
  isEmpty: boolean;
  productCount: number;
  totalBottles: number;
  totalCases: number;
  /** Singles, with each case expanded by its case size — what stock actually loses. */
  totalBaseUnits: number;
  /** The wire shape: one line per unit, since a product can carry both. */
  toItems: () => MovementLineInput[];
}

/**
 * The draft holds whole products, not just ids.
 *
 * The catalogue is paginated and searched server-side now, so a product picked
 * three pages ago is no longer in any loaded page — the summary would have
 * nothing to show its name from.
 */
export function useMovementDraft(): MovementDraft {
  const [byProductId, setByProductId] = useState<Record<string, DraftLine>>({});

  const adjust = useCallback((product: Product, unit: MovementUnit, delta: number) => {
    setByProductId((current) => {
      const line = current[product.id] ?? { product, ...EMPTY_LINE };
      const next = { ...line, product, [unit]: Math.max(0, line[unit] + delta) };

      if (next.BOTTLE === 0 && next.CASE === 0) {
        const { [product.id]: _removed, ...rest } = current;
        return rest;
      }

      return { ...current, [product.id]: next };
    });
  }, []);

  const clear = useCallback(() => setByProductId({}), []);

  return useMemo(() => {
    const lines = Object.values(byProductId);

    const totalBottles = lines.reduce((sum, line) => sum + line.BOTTLE, 0);
    const totalCases = lines.reduce((sum, line) => sum + line.CASE, 0);

    return {
      lines,
      quantityOf: (productId) => byProductId[productId] ?? EMPTY_LINE,
      adjust,
      clear,
      isEmpty: lines.length === 0,
      productCount: lines.length,
      totalBottles,
      totalCases,
      totalBaseUnits: lines.reduce(
        (sum, line) => sum + line.BOTTLE + line.CASE * line.product.caseSize,
        0,
      ),
      toItems: () =>
        lines.flatMap((line) =>
          (['BOTTLE', 'CASE'] as const)
            .filter((unit) => line[unit] > 0)
            .map((unit) => ({ productId: line.product.id, quantity: line[unit], unit })),
        ),
    };
  }, [adjust, byProductId, clear]);
}
