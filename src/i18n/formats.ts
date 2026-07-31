import type { Formats } from 'next-intl';

/**
 * The four date shapes and the signed number the product uses, named once so a
 * kardex row and a movement card cannot drift apart. `useFormatter` reads them
 * by name: `format.dateTime(date, 'full')`.
 */
export const formats = {
  dateTime: {
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    full: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    monthYear: { month: 'long', year: 'numeric' },
  },
  number: {
    /**
     * Keeps the sign visible: a ledger delta of `+12` reads differently from
     * `12`, and an adjustment is only legible when the direction is on the
     * number itself. Zero stays bare.
     */
    signed: { signDisplay: 'exceptZero' },
  },
} satisfies Formats;
