import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { answer, errorBody, loadApiUnderTest, requestOf, session, trace } from './support/http';

const { fetchMock, downloadMovementPdf, storeSession, ApiError } = await loadApiUnderTest();

const MOVEMENT_ID = '11111111-1111-4111-8111-111111111111';
const MOVEMENT_CODE = 'MOV-2026-000001';
const OBJECT_URL = 'blob:http://localhost/pdf-1';
const PDF_BYTES = '%PDF-1.4 comprobante de prueba';

const pdfAnswer = () => async () =>
  new Response(PDF_BYTES, { status: 200, headers: { 'Content-Type': 'application/pdf' } });

describe('RF-21 API - Descarga del comprobante en PDF', () => {
  let createObjectURL: MockInstance<(blob: Blob) => string>;
  let revokeObjectURL: MockInstance<(url: string) => void>;
  let click: MockInstance<HTMLAnchorElement['click']>;

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
    // jsdom implements neither, so they are stubbed rather than spied.
    createObjectURL = vi.fn((_blob: Blob) => OBJECT_URL);
    revokeObjectURL = vi.fn((_url: string) => {});
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pide GET /movements/{id}/pdf con el bearer token y sin cuerpo', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(pdfAnswer());

    // Act
    await downloadMovementPdf(MOVEMENT_ID, MOVEMENT_CODE);

    // Assert
    expect(trace(fetchMock)).toEqual([`GET /api/v1/movements/${MOVEMENT_ID}/pdf`]);
    const request = requestOf(fetchMock, 0);
    expect(request.headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
    expect(request.credentials).toBe('include');
    expect(request.body).toBeNull();
  });

  it('lee la respuesta como blob PDF con los bytes recibidos', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(pdfAnswer());

    // Act
    await downloadMovementPdf(MOVEMENT_ID, MOVEMENT_CODE);

    // Assert
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe(PDF_BYTES);
  });

  it('dispara la descarga como <código>.pdf y libera la URL temporal', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(pdfAnswer());

    // Act
    await downloadMovementPdf(MOVEMENT_ID, MOVEMENT_CODE);

    // Assert
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe(`${MOVEMENT_CODE}.pdf`);
    expect(link.href).toBe(OBJECT_URL);
    expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('un 404 lanza ApiError con el mensaje de la API y no descarga nada', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(404, errorBody(404, 'Not Found', 'No such movement in this organization')),
    );

    // Act
    const failure = await downloadMovementPdf(MOVEMENT_ID, MOVEMENT_CODE).catch(
      (error: unknown) => error,
    );

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 404,
      message: 'No such movement in this organization',
    });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('un 403 lanza ApiError con status 403 y no descarga nada', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await downloadMovementPdf(MOVEMENT_ID, MOVEMENT_CODE).catch(
      (error: unknown) => error,
    );

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(click).not.toHaveBeenCalled();
  });
});
