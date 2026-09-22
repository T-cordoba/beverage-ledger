import type { Movement } from '@/lib/api/types';

/**
 * Stub builders shared by the suites that mock the API client.
 *
 * Both exist for the same reason: an object literal describing a response is a
 * second source of truth that drifts from the real one. `ok` gets declared
 * instead of derived, `json()` gets hand-rolled, and the whole thing needs an
 * escape hatch to typecheck.
 */

/**
 * A real Response, so `ok`, `status` and `json()` behave as they do in the
 * browser. For suites that stub the global `fetch`.
 */
export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * A stubbed openapi-fetch result.
 *
 * Its return type is a union over every path the method can reach, and a
 * literal carries nothing to narrow that union by, so the call site names the
 * member it stands for — `apiResult<PatchResult>(…)` — rather than widening to
 * `any`. The response is real, so `ok` follows from `status`.
 */
export const apiResult = <T>(init: { status: number; data?: unknown; error?: unknown }) =>
  ({
    data: init.data,
    error: init.error,
    response: new Response(null, { status: init.status }),
  }) as unknown as T;

/**
 * A complete MovementDto, so a stub satisfies the type instead of casting past
 * it. Pass only the fields a test actually asserts on.
 */
export const movementStub = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'movement-1',
  code: 'MOV-2026-000001',
  type: 'OUTBOUND',
  status: 'DRAFT',
  locationId: 'location-1',
  destinationLocationId: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
  reason: null,
  note: null,
  createdBy: { id: 'user-1', name: 'Usuario de prueba' },
  confirmedAt: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  items: [],
  ...overrides,
});
