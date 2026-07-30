'use client';

import type { ActivityRow } from '@/lib/api';
import type { ActivityGranularity } from '@/features/reports';
import { formatMonthYear, formatNumber, formatShortDate } from '@/lib/utils';

/**
 * Fixed order, never cycled: received is always the first hue, dispatched the
 * second, whatever the range or the values.
 */
const SERIES = [
  { key: 'unitsIn', label: 'Received', bar: 'bg-chart-1' },
  { key: 'unitsOut', label: 'Dispatched', bar: 'bg-chart-2' },
] as const;

/** Both series count singles, so they share one scale. Two axes would lie. */
function maxOf(rows: ActivityRow[]): number {
  return Math.max(1, ...rows.flatMap((row) => [row.unitsIn, row.unitsOut]));
}

function labelFor(period: string, granularity: ActivityGranularity): string {
  return granularity === 'month' ? formatMonthYear(period) : formatShortDate(period);
}

function heightOf(value: number, max: number): string {
  if (value <= 0) return '0%';
  // A bar for a real value never rounds down to invisible.
  return `${Math.max(2, (value / max) * 100)}%`;
}

export function ActivityChart({
  rows,
  granularity,
}: {
  rows: ActivityRow[];
  granularity: ActivityGranularity;
}) {
  const max = maxOf(rows);
  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2 text-xs text-contrast/70">
            <span className={`h-2 w-4 rounded-sm ${series.bar}`} aria-hidden="true" />
            {series.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-contrast/50">peak {formatNumber(max)} units</span>
      </div>

      <div
        role="img"
        aria-label={`Units received and dispatched per ${granularity} between ${
          first ? labelFor(first.period, granularity) : ''
        } and ${last ? labelFor(last.period, granularity) : ''}`}
        className="relative h-40"
      >
        {[0, 50, 100].map((offset) => (
          <span
            key={offset}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-border/40"
            style={{ top: `${offset}%` }}
          />
        ))}

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {rows.map((row) => (
            <div
              key={row.period}
              // Native tooltip: exact numbers on hover without a second render
              // path. The table below carries them for the keyboard.
              title={`${labelFor(row.period, granularity)} — ${formatNumber(row.unitsIn)} in, ${formatNumber(row.unitsOut)} out`}
              className="flex h-full flex-1 items-end gap-[2px] rounded-sm transition-colors hover:bg-contrast/5"
            >
              {SERIES.map((series) => (
                <span
                  key={series.key}
                  className={`flex-1 rounded-t-sm ${series.bar}`}
                  style={{ height: heightOf(row[series.key], max) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {first && last && (
        <div className="flex justify-between text-xs text-contrast/50">
          <span>{labelFor(first.period, granularity)}</span>
          <span>{labelFor(last.period, granularity)}</span>
        </div>
      )}

      <table className="sr-only">
        <caption>Units received and dispatched per period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {SERIES.map((series) => (
              <th key={series.key} scope="col">
                {series.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <th scope="row">{labelFor(row.period, granularity)}</th>
              {SERIES.map((series) => (
                <td key={series.key}>{formatNumber(row[series.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
