import type { MovementType, Permission } from '@/lib/api';

interface MovementTypeMeta {
  label: string;
  /** Heads the register view and labels the button that opens it. */
  action: string;
  /** What confirming one does, said once here instead of in every view. */
  effect: string;
  permission: Permission;
  /**
   * Adjustments correct in both directions, so their quantities carry a sign and
   * the API demands a reason. Inbound and outbound take the direction from the
   * type and stay positive.
   */
  isSigned: boolean;
  requiresReason: boolean;
}

export const MOVEMENT_TYPES: Record<MovementType, MovementTypeMeta> = {
  OUTBOUND: {
    label: 'Dispatch',
    action: 'Register a dispatch',
    effect: 'Stock leaves the cellar when you confirm. Nothing moves before that.',
    permission: 'movement:create-outbound',
    isSigned: false,
    requiresReason: false,
  },
  INBOUND: {
    label: 'Inbound',
    action: 'Register an inbound',
    effect: 'What the supplier delivered. Confirming adds it to stock.',
    permission: 'movement:create-inbound',
    isSigned: false,
    requiresReason: false,
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    action: 'Register an adjustment',
    effect:
      'Breakage, spillage or a count that did not match. Quantities go negative to take units out, positive to put them back, and the reason is part of the record.',
    permission: 'movement:create-adjustment',
    isSigned: true,
    requiresReason: true,
  },
};

/**
 * Enough of a reason to mean something on an audit trail. The API only demands
 * a non-empty string, so this is the front end asking for a little more.
 */
export const MIN_REASON_LENGTH = 4;

/** Dispatch first: it is the movement of the day, the other two are exceptions. */
export const MOVEMENT_TYPE_ORDER: MovementType[] = ['OUTBOUND', 'INBOUND', 'ADJUSTMENT'];
