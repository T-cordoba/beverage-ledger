import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  API_ORIGIN,
  AppProviders,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  QUERY_SMUGGLING_ID,
  TRAVERSAL_ID,
  answer,
  blobAnswer,
  errorBody,
  loadClientUnderTest,
  queryClient,
  rawAnswer,
  requestOf,
  session,
  tokenInBrowserStorage,
  trace,
} from './support/security-harness';

const {
  fetchMock,
  downloadMovementPdf,
  storeSession,
  forgetSession,
  getAccessToken,
  ApiError,
  describeError,
} = await loadClientUnderTest();
const { MovementPdfButton } = await import('@/features/movements/MovementPdfButton');

const MOVEMENT_ID = '11111111-1111-4111-8111-111111111111';
const CODE = 'MOV-2026-000001';
const OBJECT_URL = 'blob:http://localhost:3000/5f0c1b8e-0000-4000-8000-000000000000';

let clickedLinks: HTMLAnchorElement[];

async function downloadAndCatch(id = MOVEMENT_ID, code = CODE) {
  return downloadMovementPdf(id, code).then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('RF-21 Security - Descarga del comprobante en PDF', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    window.localStorage.clear();
    clickedLinks = [];
    URL.createObjectURL = vi.fn(() => OBJECT_URL);
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedLinks.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pide el PDF con bearer al origen de la API y entrega un blob, sin token en ningún enlace', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(blobAnswer('%PDF-1.7 comprobante'));

    // Act
    await downloadMovementPdf(MOVEMENT_ID, CODE);

    // Assert
    const request = requestOf(fetchMock, 0);
    expect(trace(fetchMock)).toEqual([`GET /api/v1/movements/${MOVEMENT_ID}/pdf`]);
    expect(new URL(request.url).origin).toBe(API_ORIGIN);
    expect(request.headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].href).toBe(OBJECT_URL);
    expect(clickedLinks[0].href).not.toContain(ACCESS_TOKEN);
    expect(clickedLinks[0].href).not.toContain(API_ORIGIN);
    expect(clickedLinks[0].download).toBe(`${CODE}.pdf`);
  });

  it('el blob conserva el Content-Type application/pdf y la URL temporal se revoca tras la descarga', async () => {
    // Arrange
    const pdfBytes = '%PDF-1.7 comprobante';
    storeSession(session());
    fetchMock.mockImplementationOnce(blobAnswer(pdfBytes));

    // Act
    await downloadMovementPdf(MOVEMENT_ID, CODE);

    // Assert
    // Content, not class: Response.blob() returns Node's Blob, while the global
    // Blob under jsdom is jsdom's, so toBeInstanceOf(Blob) depends on the runtime.
    const [[blob]] = vi.mocked(URL.createObjectURL).mock.calls as [[Blob]];
    expect(await blob.text()).toBe(pdfBytes);
    expect(blob.type).toBe('application/pdf');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('sin sesión no envía Authorization, falla con 401 y no descarga nada', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Invalid refresh token')))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));

    // Act
    const failure = await downloadAndCatch();

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/auth/refresh',
      `GET /api/v1/movements/${MOVEMENT_ID}/pdf`,
    ]);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401 });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickedLinks).toHaveLength(0);
  });

  it('un 401 en la descarga invalida la sesión en memoria', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));

    // Act
    const failure = await downloadAndCatch();

    // Assert
    expect(failure).toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(clickedLinks).toHaveLength(0);
  });

  it('un 403 no genera archivo: ni blob, ni enlace, ni sesión perdida', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await downloadAndCatch();

    // Assert
    expect(failure).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickedLinks).toHaveLength(0);
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('un id de comprobante manipulado se codifica, sigue en /pdf y el 404 no descarga nada', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')))
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')));

    // Act
    const traversal = await downloadAndCatch(TRAVERSAL_ID);
    const smuggled = await downloadAndCatch(QUERY_SMUGGLING_ID);

    // Assert
    const [first, second] = [0, 1].map((call) => new URL(requestOf(fetchMock, call).url));
    expect(first.pathname).toBe('/api/v1/movements/..%2F..%2Fauth%2Flogout/pdf');
    expect(second.pathname).toBe(
      '/api/v1/movements/movement-1%3FcreatedByUserId%3Dother-user%23frag/pdf',
    );
    expect(second.search).toBe('');
    expect([traversal, smuggled]).toEqual([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 404 }),
    ]);
    expect(clickedLinks).toHaveLength(0);
  });

  it('un error con traza del servidor no se descarga como PDF ni se muestra al usuario', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));

    // Act
    const failure = await downloadAndCatch();
    const shown = describeError(failure, 'Inténtalo de nuevo.');

    // Assert
    expect(failure).toMatchObject({ status: 500, body: null });
    expect(shown).toBe('Request failed with status 500');
    for (const marker of LEAK_MARKERS) expect(shown).not.toContain(marker);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('el botón PDF ante un 403 avisa con el mensaje de la API y no expone path ni timestamp', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(
        403,
        errorBody(
          403,
          'Forbidden',
          'Insufficient permissions',
          `/api/v1/movements/${MOVEMENT_ID}/pdf`,
        ),
      ),
    );
    render(
      <AppProviders client={queryClient()}>
        <MovementPdfButton id={MOVEMENT_ID} code={CODE} />
      </AppProviders>,
    );

    // Act
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /PDF/ }));
    });

    // Assert
    expect(await screen.findByText('No se pudo descargar el PDF')).toBeTruthy();
    expect(screen.getByText('Insufficient permissions')).toBeTruthy();
    expect(document.body.textContent).not.toContain(`/api/v1/movements/${MOVEMENT_ID}/pdf`);
    expect(document.body.textContent).not.toContain('2026-01-01T00:00:00.000Z');
    expect(clickedLinks).toHaveLength(0);
  });

  it('descargar el comprobante no persiste el token en localStorage, sessionStorage ni cookies', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(blobAnswer('%PDF-1.7 comprobante'));

    // Act
    await downloadMovementPdf(MOVEMENT_ID, CODE);

    // Assert
    expect(tokenInBrowserStorage()).toBe(false);
    expect(new URL(requestOf(fetchMock, 0).url).search).toBe('');
  });
});
