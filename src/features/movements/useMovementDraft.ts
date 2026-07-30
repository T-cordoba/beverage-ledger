'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MovementLineInput, MovementType, MovementUnit, Product } from '@/lib/api';
import { MOVEMENT_TYPES } from './movement-types';

export interface DraftLine {
  product: Product;
  BOTTLE: number;
  CASE: number;
}

export const EMPTY_LINE = { BOTTLE: 0, CASE: 0 } as const;

interface DraftState {
  lines: Record<string, DraftLine>;
  /** `YYYY-MM-DD`, or empty for "now". */
  occurredAt: string;
  /** Empty means the default location, which the API resolves. */
  locationId: string;
  /** Only a transfer uses it, and then it is required. */
  destinationLocationId: string;
  reason: string;
  note: string;
  /**
   * A draft the API already holds because a confirm failed. The next submit
   * updates it instead of opening a second one and orphaning this.
   */
  pendingMovementId: string | null;
}

const EMPTY_STATE: DraftState = {
  lines: {},
  occurredAt: '',
  locationId: '',
  destinationLocationId: '',
  reason: '',
  note: '',
  pendingMovementId: null,
};

export interface MovementDraft {
  type: MovementType;
  lines: DraftLine[];
  quantityOf: (productId: string) => { BOTTLE: number; CASE: number };
  adjust: (product: Product, unit: MovementUnit, delta: number) => void;
  occurredAt: string;
  setOccurredAt: (value: string) => void;
  locationId: string;
  setLocationId: (value: string) => void;
  destinationLocationId: string;
  setDestinationLocationId: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  pendingMovementId: string | null;
  rememberPending: (id: string) => void;
  clear: () => void;
  isEmpty: boolean;
  productCount: number;
  totalBottles: number;
  totalCases: number;
  /** Singles, with each case expanded by its case size — what stock actually moves. */
  totalBaseUnits: number;
  /** The wire shape: one line per unit, since a product can carry both. */
  toItems: () => MovementLineInput[];
}

const storageKeyFor = (type: MovementType) => `beverage-ledger:movement-draft:${type}`;

function read(type: MovementType): DraftState {
  try {
    const stored = window.localStorage.getItem(storageKeyFor(type));
    return stored ? { ...EMPTY_STATE, ...(JSON.parse(stored) as DraftState) } : EMPTY_STATE;
  } catch {
    // Private-mode storage, a quota error or a shape from an older release: an
    // unreadable draft is an empty draft, never a crash on load.
    return EMPTY_STATE;
  }
}

/**
 * The draft holds whole products, not just ids.
 *
 * The catalogue is paginated and searched server-side, so a product picked three
 * pages ago is no longer in any loaded page and the summary would have nothing to
 * show its name from. Names can go stale that way, which is harmless: the API
 * validates the ids and writes its own snapshot when the movement is confirmed.
 *
 * State survives a reload through localStorage, one entry per movement type, so
 * a half-captured dispatch is not lost to a misplaced refresh.
 */
export function useMovementDraft(type: MovementType): MovementDraft {
  const [state, setState] = useState<DraftState>(EMPTY_STATE);
  const [isRestored, setIsRestored] = useState(false);

  // Restored after mount rather than in the initializer: the server has no
  // localStorage, and hydrating from it there would mismatch the markup.
  useEffect(() => {
    setState(read(type));
    setIsRestored(true);
  }, [type]);

  useEffect(() => {
    if (!isRestored) return;

    try {
      if (state === EMPTY_STATE) {
        window.localStorage.removeItem(storageKeyFor(type));
      } else {
        window.localStorage.setItem(storageKeyFor(type), JSON.stringify(state));
      }
    } catch {
      // Storage full or blocked. The draft still works for this session.
    }
  }, [isRestored, state, type]);

  const { isSigned } = MOVEMENT_TYPES[type];

  const adjust = useCallback(
    (product: Product, unit: MovementUnit, delta: number) => {
      setState((current) => {
        const line = current.lines[product.id] ?? { product, ...EMPTY_LINE };
        const raw = line[unit] + delta;
        // Only an adjustment moves both ways; the type carries the direction
        // everywhere else, so a negative there would be nonsense.
        const next = { ...line, product, [unit]: isSigned ? raw : Math.max(0, raw) };

        if (next.BOTTLE === 0 && next.CASE === 0) {
          const { [product.id]: _removed, ...rest } = current.lines;
          return { ...current, lines: rest };
        }

        return { ...current, lines: { ...current.lines, [product.id]: next } };
      });
    },
    [isSigned],
  );

  const clear = useCallback(() => setState(EMPTY_STATE), []);

  const setOccurredAt = useCallback(
    (occurredAt: string) => setState((current) => ({ ...current, occurredAt })),
    [],
  );
  const setLocationId = useCallback(
    (locationId: string) =>
      setState((current) => ({
        ...current,
        locationId,
        // A transfer cannot end where it starts, and the origin is the one that
        // just moved, so the destination is the one to give up.
        destinationLocationId:
          current.destinationLocationId === locationId ? '' : current.destinationLocationId,
      })),
    [],
  );
  const setDestinationLocationId = useCallback(
    (destinationLocationId: string) =>
      setState((current) => ({ ...current, destinationLocationId })),
    [],
  );
  const setReason = useCallback(
    (reason: string) => setState((current) => ({ ...current, reason })),
    [],
  );
  const setNote = useCallback((note: string) => setState((current) => ({ ...current, note })), []);
  const rememberPending = useCallback(
    (pendingMovementId: string) => setState((current) => ({ ...current, pendingMovementId })),
    [],
  );

  return useMemo(() => {
    const lines = Object.values(state.lines);
    const counts = (unit: MovementUnit) => lines.reduce((sum, line) => sum + line[unit], 0);

    return {
      type,
      lines,
      quantityOf: (productId) => state.lines[productId] ?? EMPTY_LINE,
      adjust,
      occurredAt: state.occurredAt,
      setOccurredAt,
      locationId: state.locationId,
      setLocationId,
      destinationLocationId: state.destinationLocationId,
      setDestinationLocationId,
      reason: state.reason,
      setReason,
      note: state.note,
      setNote,
      pendingMovementId: state.pendingMovementId,
      rememberPending,
      clear,
      isEmpty: lines.length === 0,
      productCount: lines.length,
      totalBottles: counts('BOTTLE'),
      totalCases: counts('CASE'),
      totalBaseUnits: lines.reduce(
        (sum, line) => sum + line.BOTTLE + line.CASE * line.product.caseSize,
        0,
      ),
      toItems: () =>
        lines.flatMap((line) =>
          (['BOTTLE', 'CASE'] as const)
            .filter((unit) => line[unit] !== 0)
            .map((unit) => ({ productId: line.product.id, quantity: line[unit], unit })),
        ),
    };
  }, [
    adjust,
    clear,
    rememberPending,
    setDestinationLocationId,
    setLocationId,
    setNote,
    setOccurredAt,
    setReason,
    state,
    type,
  ]);
}
