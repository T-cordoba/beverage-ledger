import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/**
 * The text of a receipt, one string per text operator. The API renders it with
 * the standard Helvetica fonts, so every string is ASCII written as hex
 * (`<4D4F562D...> Tj`) inside FlateDecode content streams: inflating those and
 * decoding the hex is enough, no PDF parser needed.
 */
export function readPdfText(path: string): string[] {
  const bytes = readFileSync(path);
  const raw = bytes.toString('latin1');
  const texts: string[] = [];
  const streamStart = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamStart.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    let content: string;
    try {
      content = inflateSync(bytes.subarray(start, end)).toString('latin1');
    } catch {
      continue; // Not a compressed content stream (fonts, images…).
    }
    for (const [, hex] of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      texts.push(Buffer.from(hex!, 'hex').toString('latin1'));
    }
  }
  return texts;
}

/** Whether the file starts with the PDF signature and closes with %%EOF. */
export function isPdf(path: string): boolean {
  const bytes = readFileSync(path);
  return (
    bytes.subarray(0, 5).toString('latin1') === '%PDF-' &&
    bytes.subarray(-1024).toString('latin1').includes('%%EOF')
  );
}

/** Removes an earlier copy, so a download that never happens cannot pass on an old file. */
export function forgetDownload(folder: string, fileName: string): void {
  rmSync(join(folder, fileName), { force: true });
}

/**
 * Waits for Chrome to finish writing `fileName` into the downloads folder: the
 * file exists, there is no .crdownload left and its size stopped changing.
 */
export async function waitForDownload(folder: string, fileName: string, timeout = 30_000) {
  const path = join(folder, fileName);
  const deadline = Date.now() + timeout;
  let lastSize = -1;
  while (Date.now() < deadline) {
    const pending = readdirSync(folder).some((name) => name.endsWith('.crdownload'));
    if (existsSync(path) && !pending) {
      const size = statSync(path).size;
      if (size > 0 && size === lastSize) return path;
      lastSize = size;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(
    `No se descargó ${fileName} en ${timeout / 1000}s. Archivos presentes: ${readdirSync(folder).join(', ') || '(ninguno)'}`,
  );
}
