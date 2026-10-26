import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

export const RECEIPT_FILE_NAME = new RegExp(DATA.receipt.fileName);
