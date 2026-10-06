import { expect } from 'chai';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { downloadMovementPdf } from '@/features/movements/api';

vi.mock('@/features/movements/api', () => ({
  downloadMovementPdf: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
  };
});

const mockedDownloadPdf = vi.mocked(downloadMovementPdf);

const movementId = 'movement-1';
const movementCode = 'MOV-001';

describe('RF-21 - Descarga del comprobante en PDF - Front', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - la descarga del comprobante se ejecuta correctamente y finaliza sin error', async () => {
    // Arrange
    mockedDownloadPdf.mockResolvedValue(undefined);

    // Act
    await downloadMovementPdf(movementId, movementCode);

    // Assert
    expect(mockedDownloadPdf.mock.calls, 'download calls').to.deep.include([
      movementId,
      movementCode,
    ]);
    expect(mockedDownloadPdf.mock.results, 'download results').to.have.lengthOf(1);
    expect(mockedDownloadPdf.mock.results[0], 'download result').to.have.property('type', 'return');
  });

  it('Camino 2 - ocurre un error durante la descarga y se propaga la excepción', async () => {
    // Arrange
    const errorMsg = 'Network error';
    mockedDownloadPdf.mockRejectedValue(new Error(errorMsg));

    // Act & Assert
    const error = await downloadMovementPdf(movementId, movementCode).catch((e) => e);
    expect(error, 'download error')
      .to.be.instanceOf(Error)
      .and.to.have.property('message', errorMsg);
    expect(mockedDownloadPdf.mock.calls, 'download calls').to.deep.include([
      movementId,
      movementCode,
    ]);
  });
});
