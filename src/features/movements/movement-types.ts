import type { MovementType, Permission } from '@/lib/api';

/**
 * What each type *does*. What each type is *called* — its label, the heading of
 * its capture view, what confirming one means — lives in `movements.types` in
 * the message catalogue, keyed by the same `MovementType`.
 */
interface MovementTypeMeta {
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
    permission: 'movement:create-outbound',
    isSigned: false,
    requiresReason: false,
    needsDestination: false,
    takesFromOrigin: true,
  },
  INBOUND: {
    permission: 'movement:create-inbound',
    isSigned: false,
    requiresReason: false,
    needsDestination: false,
    takesFromOrigin: false,
  },
  ADJUSTMENT: {
    permission: 'movement:create-adjustment',
    isSigned: true,
    requiresReason: true,
    needsDestination: false,
    takesFromOrigin: false,
  },
  TRANSFER: {
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
