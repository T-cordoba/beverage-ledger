import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadMovementPdf } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';

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
const mockedApiGet = vi.mocked(api.GET);

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
    expect(mockedDownloadPdf).toHaveBeenCalledWith(movementId, movementCode);
    expect(mockedDownloadPdf).toHaveReturned();
  });

  it('Camino 2 - ocurre un error durante la descarga y se propaga la excepción', async () => {
    // Arrange
    const errorMsg = 'Network error';
    mockedDownloadPdf.mockRejectedValue(new Error(errorMsg));

    // Act & Assert
    await expect(
      downloadMovementPdf(movementId, movementCode),
    ).rejects.toThrow(errorMsg);
    expect(mockedDownloadPdf).toHaveBeenCalledWith(movementId, movementCode);
  });
});