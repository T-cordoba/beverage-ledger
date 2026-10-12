import { expect } from 'chai';
import { afterEach, beforeEach, describe, it, vi, type MockInstance } from 'vitest';
import { downloadMovementPdf } from '@/features/movements/api';
import { ApiError } from '@/lib/api/errors';
import { apiReply } from './support/movements-harness';

const { client } = vi.hoisted(() => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const objectUrl = 'blob:http://localhost/pdf-1';

describe('RF-21 regression - the PDF document reaches the browser intact', () => {
  let clickSpy: MockInstance<HTMLAnchorElement['click']>;

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement either, so they are stubbed rather than spied.
    URL.createObjectURL = vi.fn(() => objectUrl);
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands the received blob itself to the object URL', async () => {
    // Arrange
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    client.GET.mockResolvedValue(apiReply(200, { data: pdf }));

    // Act
    await downloadMovementPdf('movement-1', 'MOV-001');

    // Assert
    expect(vi.mocked(URL.createObjectURL).mock.calls, 'created urls').to.deep.equal([[pdf]]);
  });

  it('revokes the object URL only after the link was clicked', async () => {
    // Arrange
    client.GET.mockResolvedValue(apiReply(200, { data: new Blob(['%PDF-1.4']) }));

    // Act
    await downloadMovementPdf('movement-1', 'MOV-001');

    // Assert
    const [clickedAt] = clickSpy.mock.invocationCallOrder;
    const [revokedAt] = vi.mocked(URL.revokeObjectURL).mock.invocationCallOrder;
    expect(clickedAt, 'click order').to.be.lessThan(revokedAt);
  });

  it('a 200 without a body throws ApiError instead of downloading an empty file', async () => {
    // Arrange
    client.GET.mockResolvedValue(apiReply(200));

    // Act
    const error = await downloadMovementPdf('movement-1', 'MOV-001').catch((e: unknown) => e);

    // Assert
    expect(error, 'thrown error').to.be.instanceOf(ApiError).and.to.include({ status: 200 });
    expect(clickSpy.mock.calls, 'link clicks').to.have.lengthOf(0);
  });

  it('a 403 for a user without access throws ApiError and creates no object URL', async () => {
    // Arrange
    client.GET.mockResolvedValue(
      apiReply(403, { error: { statusCode: 403, message: 'Forbidden resource' } }),
    );

    // Act
    const error = await downloadMovementPdf('movement-1', 'MOV-001').catch((e: unknown) => e);

    // Assert
    expect(error, 'thrown error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 403, message: 'Forbidden resource' });
    expect(vi.mocked(URL.createObjectURL).mock.calls, 'created urls').to.have.lengthOf(0);
  });
});
