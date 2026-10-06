import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, vi } from 'vitest';
import { openDraft } from '@/features/movements/open-draft';
import { read, useMovementDraft } from '@/features/movements/useMovementDraft';
import type { Movement, Product } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';

const { client } = vi.hoisted(() => ({ client: { PATCH: vi.fn(), POST: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const product = {
  id: 'product-1',
  name: 'Test product',
  category: { id: 'category-1', name: 'Spirits' },
  brand: { id: 'brand-1', name: 'Test brand' },
  subcategory: 'Vodka',
  abv: 40,
  origin: 'Sweden',
  age: null,
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
} as Product;

const staleDraftId = 'draft-1';
const outboundKey = 'beverage-ledger:movement-draft:OUTBOUND';

const result = (status: number, init: { data?: Partial<Movement>; error?: unknown } = {}) => ({
  response: new Response(null, { status }),
  ...init,
});

const outbound = (draftId: string | null) => ({
  type: 'OUTBOUND' as const,
  items: [{ productId: product.id, quantity: 1, unit: 'BOTTLE' as const }],
  reason: 'Bar restock',
  draftId,
});

describe('RF-19 regression - save and resume a draft', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('a captured draft survives a remount, as it does a page reload', () => {
    const first = renderHook(() => useMovementDraft('OUTBOUND'));
    act(() => {
      first.result.current.adjust(product, 'CASE', 2);
      first.result.current.setReason('Bar restock');
    });
    first.unmount();

    const { result: reloaded } = renderHook(() => useMovementDraft('OUTBOUND'));

    expect(reloaded.current.quantityOf(product.id), 'restored line')
      .to.include({ CASE: 2, BOTTLE: 0 })
      .and.to.have.nested.property('product.caseSize', 12);
    expect(reloaded.current.reason, 'restored reason').to.equal('Bar restock');
  });

  it('each movement type keeps its own draft', () => {
    const { result: outboundDraft } = renderHook(() => useMovementDraft('OUTBOUND'));
    act(() => outboundDraft.current.adjust(product, 'BOTTLE', 3));

    const { result: inboundDraft } = renderHook(() => useMovementDraft('INBOUND'));

    expect(inboundDraft.current.isEmpty, 'inbound draft is empty').to.equal(true);
    expect(Object.keys(window.localStorage), 'stored drafts').to.have.members([outboundKey]);
  });

  it('a draft saved by an older release gets the fields it did not know about', () => {
    window.localStorage.setItem(outboundKey, JSON.stringify({ lines: {}, note: 'Old shape' }));

    const draft = read('OUTBOUND');

    expect(draft, 'restored draft').to.have.all.keys(
      'lines',
      'occurredAt',
      'locationId',
      'destinationLocationId',
      'reason',
      'note',
      'pendingMovementId',
    );
    expect(draft, 'restored draft').to.deep.include({ note: 'Old shape', pendingMovementId: null });
  });

  it('a server error on the reused draft is surfaced and never opens a second movement', async () => {
    client.PATCH.mockResolvedValue(
      result(500, { error: { statusCode: 500, message: 'Internal server error' } }),
    );

    const error = await openDraft(outbound(staleDraftId)).catch((e: unknown) => e);

    expect(error, 'thrown error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 500, message: 'Internal server error' });
    expect(client.POST.mock.calls, 'create calls').to.be.empty;
  });

  it('a draft gone with a 404 is replaced by a new movement that carries no stale id', async () => {
    client.PATCH.mockResolvedValue(result(404, { error: { statusCode: 404, message: 'Gone' } }));
    client.POST.mockResolvedValue(result(201, { data: { id: 'draft-2', status: 'DRAFT' } }));

    const opened = await openDraft(outbound(staleDraftId));

    expect(opened, 'opened movement').to.deep.equal({ id: 'draft-2', status: 'DRAFT' });
    expect(client.PATCH.mock.calls[0][1].body, 'update body').to.have.all.keys(
      'items',
      'occurredAt',
      'reason',
      'note',
    );
    expect(client.POST.mock.calls[0][1].body, 'create body').to.not.have.property('draftId');
    expect(client.POST.mock.calls[0][1].body, 'create body').to.deep.include({
      type: 'OUTBOUND',
      reason: 'Bar restock',
    });
    expect(client.PATCH.mock.invocationCallOrder[0], 'update before create').to.be.below(
      client.POST.mock.invocationCallOrder[0],
    );
  });
});
