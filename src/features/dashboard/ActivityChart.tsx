'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { ActivityRow } from '@/lib/api';
import type { ActivityGranularity } from '@/features/reports';

/**
 * Fixed order, never cycled: received is always the first hue, dispatched the
 * second, whatever the range or the values.
 */
const SERIES = [
  { key: 'unitsIn', label: 'received', bar: 'bg-chart-1' },
  { key: 'unitsOut', label: 'dispatched', bar: 'bg-chart-2' },
] as const;

/** Both series count singles, so they share one scale. Two axes would lie. */
function maxOf(rows: ActivityRow[]): number {
  return Math.max(1, ...rows.flatMap((row) => [row.unitsIn, row.unitsOut]));
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
  const t = useTranslations('dashboard.activity');
  const tGranularity = useTranslations('reports.granularity');
  const format = useFormatter();

  const max = maxOf(rows);
  const first = rows[0];
  const last = rows[rows.length - 1];

  const labelFor = (period: string) =>
    format.dateTime(new Date(period), granularity === 'month' ? 'monthYear' : 'short');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2 text-xs text-contrast/70">
            <span className={`h-2 w-4 rounded-sm ${series.bar}`} aria-hidden="true" />
            {t(series.label)}
          </span>
        ))}
        <span className="ml-auto text-xs text-contrast/50">{t('peak', { count: max })}</span>
      </div>

      <div
        role="img"
        aria-label={t('chartLabel', {
          granularity: tGranularity(granularity),
          from: first ? labelFor(first.period) : '',
          to: last ? labelFor(last.period) : '',
        })}
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
              title={t('tooltip', {
                period: labelFor(row.period),
                in: format.number(row.unitsIn),
                out: format.number(row.unitsOut),
              })}
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
          <span>{labelFor(first.period)}</span>
          <span>{labelFor(last.period)}</span>
        </div>
      )}

      <table className="sr-only">
        <caption>{t('caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('period')}</th>
            {SERIES.map((series) => (
              <th key={series.key} scope="col">
                {t(series.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <th scope="row">{labelFor(row.period)}</th>
              {SERIES.map((series) => (
                <td key={series.key}>{format.number(row[series.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
