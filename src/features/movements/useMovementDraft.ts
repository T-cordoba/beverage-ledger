'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * No longer captured: the API stamps every movement with its own clock. Kept
   * in the stored shape so drafts saved by earlier releases still read back.
   */
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

/** A movement read back from the API, in the shape the draft stores it. */
export interface RestoredDraft {
  movementId: string;
  lines: DraftLine[];
  occurredAt: string;
  locationId: string;
  destinationLocationId: string;
  reason: string;
  note: string;
}

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
  /** Replaces the whole draft with one the API already holds. */
  restore: (state: RestoredDraft) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** When this device last wrote the draft to storage; null until it has. */
  savedAt: Date | null;
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

/** Enough to walk back a capture; past that the oldest steps are dropped. */
const HISTORY_LIMIT = 50;

interface History {
  past: DraftState[];
  present: DraftState;
  future: DraftState[];
}

const fresh = (present: DraftState): History => ({ past: [], present, future: [] });

export function read(type: MovementType): DraftState {
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
 *
 * Every edit is a step that can be undone, except `pendingMovementId`: that is
 * the API's draft, and undoing past it would orphan it. Keystrokes in the same
 * text field fold into one step, or undoing a reason would take a letter at a time.
 */
export function useMovementDraft(type: MovementType): MovementDraft {
  const [history, setHistory] = useState<History>(() => fresh(EMPTY_STATE));
  const [isRestored, setIsRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastEdit = useRef<string | null>(null);
  const state = history.present;

  /** `field` folds consecutive edits of the same text field into one step. */
  const setState = useCallback((update: (current: DraftState) => DraftState, field?: string) => {
    // Decided outside the updater, which React may run twice.
    const folds = field !== undefined && field === lastEdit.current;
    lastEdit.current = field ?? null;

    setHistory((current) => {
      const next = update(current.present);
      if (next === current.present) return current;

      return {
        past: folds ? current.past : [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const replace = useCallback((present: DraftState) => {
    lastEdit.current = null;
    setHistory(fresh(present));
  }, []);

  const undo = useCallback(() => {
    lastEdit.current = null;
    setHistory(({ past, present, future }) => {
      const previous = past.at(-1);
      if (!previous) return { past, present, future };

      return {
        past: past.slice(0, -1),
        present: { ...previous, pendingMovementId: present.pendingMovementId },
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    lastEdit.current = null;
    setHistory(({ past, present, future }) => {
      const [next, ...rest] = future;
      if (!next) return { past, present, future };

      return {
        past: [...past, present],
        present: { ...next, pendingMovementId: present.pendingMovementId },
        future: rest,
      };
    });
  }, []);

  // Restored after mount rather than in the initializer: the server has no
  // localStorage, and hydrating from it there would mismatch the markup.
  useEffect(() => {
    replace(read(type));
    setIsRestored(true);
  }, [replace, type]);

  useEffect(() => {
    if (!isRestored) return;

    try {
      if (state === EMPTY_STATE) {
        window.localStorage.removeItem(storageKeyFor(type));
        setSavedAt(null);
      } else {
        window.localStorage.setItem(storageKeyFor(type), JSON.stringify(state));
        setSavedAt(new Date());
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
    [isSigned, setState],
  );

  const clear = useCallback(() => replace(EMPTY_STATE), [replace]);

  const setOccurredAt = useCallback(
    (occurredAt: string) => setState((current) => ({ ...current, occurredAt })),
    [setState],
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
    [setState],
  );
  const setDestinationLocationId = useCallback(
    (destinationLocationId: string) =>
      setState((current) => ({ ...current, destinationLocationId })),
    [setState],
  );
  const setReason = useCallback(
    (reason: string) => setState((current) => ({ ...current, reason }), 'reason'),
    [setState],
  );
  const setNote = useCallback(
    (note: string) => setState((current) => ({ ...current, note }), 'note'),
    [setState],
  );
  // Not a step: it records what the API holds, which no undo can take back.
  const rememberPending = useCallback(
    (pendingMovementId: string) =>
      setHistory((current) => ({
        ...current,
        present: { ...current.present, pendingMovementId },
      })),
    [],
  );

  const restore = useCallback(
    (restored: RestoredDraft) =>
      replace({
        lines: Object.fromEntries(restored.lines.map((line) => [line.product.id, line])),
        occurredAt: restored.occurredAt,
        locationId: restored.locationId,
        destinationLocationId: restored.destinationLocationId,
        reason: restored.reason,
        note: restored.note,
        pendingMovementId: restored.movementId,
      }),
    [replace],
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
      restore,
      clear,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      savedAt,
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
    history,
    redo,
    rememberPending,
    restore,
    savedAt,
    setDestinationLocationId,
    setLocationId,
    setNote,
    setOccurredAt,
    setReason,
    state,
    type,
    undo,
  ]);
}
