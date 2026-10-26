import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The data the scenarios type in, kept in movimientos.json next to this file so
 * it can be changed without touching a spec. Read from disk instead of imported: the repo's ESLint
 * forbids relative imports that climb out of the folder.
 */
type TestData = {
  locations: { source: string; destination: string };
  notes: { outbound: string; inbound: string; transfer: string };
  reasons: { adjustment: string; cancellation: string; tooShort: string; blank: string };
  minReasonLength: number;
  receipt: { fileName: string; typeLabels: Record<string, string> };
};

export const DATA: TestData = JSON.parse(
  readFileSync(join(__dirname, 'movimientos.json'), 'utf8'),
);

/** The receipt's file name, as a RegExp: `MOV-2026-000123.pdf`. */
export const RECEIPT_FILE_NAME = new RegExp(DATA.receipt.fileName);
