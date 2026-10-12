import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { BUDGET_MS, loadUnderTest, session, timed, uuid } from './support/perf';

const { fetchMock, downloadMovementPdf, storeSession } = await loadUnderTest();

const FIVE_MB = 5 * 1024 * 1024;

/** A PDF-shaped body of the given size: the header, then filler bytes. */
function pdfBytes(size: number): ArrayBuffer {
  const bytes = new Uint8Array(size).fill(0x20);
  bytes.set(new TextEncoder().encode('%PDF-1.4\n'));
  return bytes.buffer;
}

const pdfAnswer = (size: number) => async () =>
  new Response(pdfBytes(size), { status: 200, headers: { 'Content-Type': 'application/pdf' } });

describe('RF-21 Performance - Descarga del comprobante en PDF', () => {
  let createObjectURL: MockInstance<(blob: Blob) => string>;
  let revokeObjectURL: MockInstance<(url: string) => void>;
  let click: MockInstance<HTMLAnchorElement['click']>;
  let issued: number;

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
    issued = 0;
    // jsdom implements neither, so they are stubbed rather than spied.
    createObjectURL = vi.fn((_blob: Blob) => `blob:http://localhost/pdf-${(issued += 1)}`);
    revokeObjectURL = vi.fn((_url: string) => {});
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('descarga un PDF de 5 MB y lo entrega como blob íntegro dentro del presupuesto de carga grande', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(pdfAnswer(FIVE_MB));

    // Act
    const { ms } = await timed(() => downloadMovementPdf(uuid(1, '1'), 'MOV-2026-000001'));

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(FIVE_MB);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('20 descargas seguidas de 500 KB terminan dentro del presupuesto de lote y no dejan URLs temporales sin liberar', async () => {
    // Arrange
    fetchMock.mockImplementation(pdfAnswer(500 * 1024));

    // Act
    const { ms } = await timed(async () => {
      for (let i = 1; i <= 20; i += 1) {
        await downloadMovementPdf(uuid(i, '1'), `MOV-2026-${String(i).padStart(6, '0')}`);
      }
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(createObjectURL).toHaveBeenCalledTimes(20);
    const created = createObjectURL.mock.results.map((entry) => entry.value as string);
    const revoked = revokeObjectURL.mock.calls.map(([url]) => url);
    expect(revoked).toEqual(created);
  });

  it('10 descargas concurrentes producen 10 archivos con su propio nombre dentro del presupuesto de lote', async () => {
    // Arrange
    fetchMock.mockImplementation(pdfAnswer(256 * 1024));
    const codes = Array.from(
      { length: 10 },
      (_, i) => `MOV-2026-${String(i + 1).padStart(6, '0')}`,
    );

    // Act
    const { ms } = await timed(() =>
      Promise.all(codes.map((code, i) => downloadMovementPdf(uuid(i + 1, '1'), code))),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(click).toHaveBeenCalledTimes(10);
    const names = click.mock.contexts.map((link) => (link as HTMLAnchorElement).download);
    expect(new Set(names)).toEqual(new Set(codes.map((code) => `${code}.pdf`)));
    expect(revokeObjectURL).toHaveBeenCalledTimes(10);
  });
});
