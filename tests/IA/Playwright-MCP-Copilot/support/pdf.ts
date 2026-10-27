import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/**
 * The text of a receipt PDF, one string per text operator. The API renders it
 * with the standard Helvetica fonts, so every string is plain ASCII written as
 * hex (`<4D4F562D...> Tj`) inside FlateDecode content streams: inflating those
 * and decoding the hex is enough, no PDF parser needed.
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
      texts.push(Buffer.from(hex, 'hex').toString('latin1'));
    }
  }
  return texts;
}

/** Whether the file starts with the PDF signature. */
export function isPdf(path: string): boolean {
  return readFileSync(path).subarray(0, 5).toString('latin1') === '%PDF-';
}
