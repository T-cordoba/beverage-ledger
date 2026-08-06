import type { AuditAction, AuditEntity } from '@/lib/api';

/**
 * Every audited action and the entity it belongs to, in the order the filter
 * offers them.
 *
 * Typed as a `Record` over the generated union on purpose: the compiler then
 * refuses the file if the API grows an action nobody listed here, which is the
 * only thing keeping a dropdown that claims to hold everything honest. The
 * values are not decoration either — an action is named `<entity>.<verb>`, but
 * parsing the name to get the entity would make the naming a contract nobody
 * declared.
 */
const ENTITY_OF: Record<AuditAction, AuditEntity> = {
  'movement.created': 'movement',
  'movement.updated': 'movement',
  'movement.confirmed': 'movement',
  'movement.cancelled': 'movement',

  'product.created': 'product',
  'product.updated': 'product',
  'product.deactivated': 'product',

  'category.created': 'category',
  'category.updated': 'category',
  'category.deleted': 'category',

  'brand.created': 'brand',
  'brand.updated': 'brand',
  'brand.deleted': 'brand',

  'location.created': 'location',
  'location.updated': 'location',
  'location.deleted': 'location',

  'user.signed-in': 'user',
  'user.sign-in-failed': 'user',
  'user.password-changed': 'user',
  'user.updated': 'user',

  'invitation.created': 'invitation',
  'invitation.revoked': 'invitation',
  'invitation.accepted': 'invitation',

  'organization.updated': 'organization',
};

export const AUDIT_ACTIONS = Object.keys(ENTITY_OF) as AuditAction[];

/** Derived rather than listed again, so the two can never disagree. */
export const AUDIT_ENTITIES = [...new Set(Object.values(ENTITY_OF))];

/** What the action filter may offer once an entity narrows it. */
export function auditActionsOf(entity: AuditEntity | ''): AuditAction[] {
  return entity ? AUDIT_ACTIONS.filter((action) => ENTITY_OF[action] === entity) : AUDIT_ACTIONS;
}

export function auditEntityOf(action: AuditAction): AuditEntity {
  return ENTITY_OF[action];
}
