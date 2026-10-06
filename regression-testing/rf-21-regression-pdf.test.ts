import { expect } from 'chai';
import { afterEach, beforeEach, describe, it, vi, type MockInstance } from 'vitest';
import { downloadMovementPdf } from '@/features/movements/api';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { GET: vi.fn() },
  };
});

type PdfResult = Awaited<ReturnType<typeof api.GET>>;

// Built here rather than imported from tests/support: the @/ alias only reaches
// src/, and the lint rule forbids climbing out of this directory.
const pdfResult = (init: { status: number; data?: Blob; error?: unknown }) =>
  ({
    data: init.data,
    error: init.error,
    response: new Response(null, { status: init.status }),
  }) as unknown as PdfResult;

const mockedGet = vi.mocked(api.GET);

const movementId = 'movement-1';
const movementCode = 'MOV-001';
const objectUrl = 'blob:http://localhost/pdf-1';

describe('RF-21 regression - download the movement PDF', () => {
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

  it('names the downloaded file after the movement code', async () => {
    // Arrange
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    mockedGet.mockResolvedValue(pdfResult({ status: 200, data: pdf }));

    // Act
    await downloadMovementPdf(movementId, movementCode);

    // Assert
    expect(clickSpy.mock.calls, 'link clicks').to.have.lengthOf(1);
    const link = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download, 'file name').to.equal(`${movementCode}.pdf`);
    expect(link.href, 'link href').to.equal(objectUrl);
    expect(vi.mocked(URL.revokeObjectURL).mock.calls, 'revoked urls').to.deep.equal([[objectUrl]]);
  });

  it('requests the PDF route with the movement id as a blob', async () => {
    // Arrange
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    mockedGet.mockResolvedValue(pdfResult({ status: 200, data: pdf }));

    // Act
    await downloadMovementPdf(movementId, movementCode);

    // Assert
    expect(mockedGet.mock.calls, 'GET calls').to.have.lengthOf(1);
    expect(mockedGet.mock.calls[0], 'GET arguments').to.deep.equal([
      '/api/v1/movements/{id}/pdf',
      { params: { path: { id: movementId } }, parseAs: 'blob' },
    ]);
  });

  it('a 404 throws ApiError and never clicks the link', async () => {
    // Arrange
    mockedGet.mockResolvedValue(
      pdfResult({
        status: 404,
        error: { statusCode: 404, message: 'Movement not found' },
      }),
    );

    // Act
    const error = await downloadMovementPdf(movementId, movementCode).catch((e: unknown) => e);

    // Assert
    expect(error, 'thrown error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 404, message: 'Movement not found' });
    expect(clickSpy.mock.calls, 'link clicks').to.have.lengthOf(0);
    expect(vi.mocked(URL.createObjectURL).mock.calls, 'created urls').to.have.lengthOf(0);
  });
});
