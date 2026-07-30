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
  /**
   * A transfer needs two locations and the others need one, so the capture view
   * asks this instead of comparing against the type in three places.
   */
  needsDestination: boolean;
  /**
   * Whether every line of this type takes units out of the origin, which is what
   * lets the picker stop at what is on hand.
   *
   * False for an adjustment even though a negative one also removes stock: an
   * adjustment exists precisely because the recorded number is wrong, so capping
   * it by that number would be circular. The API still refuses to go below zero.
   */
  takesFromOrigin: boolean;
}

export const MOVEMENT_TYPES: Record<MovementType, MovementTypeMeta> = {
  OUTBOUND: {
    label: 'Dispatch',
    action: 'Register a dispatch',
    effect: 'Stock leaves the cellar when you confirm. Nothing moves before that.',
    permission: 'movement:create-outbound',
    isSigned: false,
    requiresReason: false,
    needsDestination: false,
    takesFromOrigin: true,
  },
  INBOUND: {
    label: 'Inbound',
    action: 'Register an inbound',
    effect: 'What the supplier delivered. Confirming adds it to stock.',
    permission: 'movement:create-inbound',
    isSigned: false,
    requiresReason: false,
    needsDestination: false,
    takesFromOrigin: false,
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    action: 'Register an adjustment',
    effect:
      'Breakage, spillage or a count that did not match. Quantities go negative to take units out, positive to put them back, and the reason is part of the record.',
    permission: 'movement:create-adjustment',
    isSigned: true,
    requiresReason: true,
    needsDestination: false,
    takesFromOrigin: false,
  },
  TRANSFER: {
    label: 'Transfer',
    action: 'Register a transfer',
    effect:
      'Moves stock from one location to another. The total on hand does not change: confirming writes both sides at once.',
    permission: 'movement:create-transfer',
    isSigned: false,
    requiresReason: false,
    needsDestination: true,
    takesFromOrigin: true,
  },
};

/**
 * Enough of a reason to mean something on an audit trail. The API only demands
 * a non-empty string, so this is the front end asking for a little more.
 */
export const MIN_REASON_LENGTH = 4;

/** Dispatch first: it is the movement of the day, the rest are exceptions. */
export const MOVEMENT_TYPE_ORDER: MovementType[] = [
  'OUTBOUND',
  'INBOUND',
  'TRANSFER',
  'ADJUSTMENT',
];
