'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ActivityRow } from '@/lib/api';
import type { ActivityGranularity } from '@/features/reports';
import { cn } from '@/lib/utils';

/**
 * Fixed order, never cycled: received is always the first hue, dispatched the
 * second, whatever the range or the values.
 */
const SERIES = [
  { key: 'unitsIn', label: 'received', bar: 'bg-chart-1', line: 'bg-chart-1' },
  { key: 'unitsOut', label: 'dispatched', bar: 'bg-chart-2', line: 'bg-chart-2' },
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

  const plotRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = maxOf(rows);
  const first = rows[0];
  const last = rows[rows.length - 1];

  const labelFor = (period: string) =>
    format.dateTime(new Date(period), granularity === 'month' ? 'monthYear' : 'short');

  // Nearest position rather than per-bar handlers: at a month of daily bars each
  // one is a couple of pixels wide, and the reader is aiming at a date.
  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    const plot = plotRef.current;

    if (!plot || rows.length === 0) return;

    const { left, width } = plot.getBoundingClientRect();
    const ratio = (event.clientX - left) / width;
    const index = Math.floor(ratio * rows.length);

    setActiveIndex(Math.min(rows.length - 1, Math.max(0, index)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    const step = steps[event.key];

    if (step !== undefined) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(rows.length - 1, Math.max(0, (current ?? 0) + step)));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(rows.length - 1);
    } else if (event.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  const active = activeIndex === null ? null : rows[activeIndex];

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

      <div className="relative">
        {/* Above the plot rather than inside it, so a tall bar never covers its
            own readout. Pointer-events off: it must not steal the hover it
            describes. */}
        {active && (
          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute bottom-full z-floating mb-2 w-max min-w-32 max-w-56',
              'rounded-lg border border-border bg-surface p-3 shadow-overlay',
            )}
            style={positionOf(activeIndex ?? 0, rows.length)}
          >
            <p className="mb-2 text-xs font-medium text-contrast/70">{labelFor(active.period)}</p>
            <ul className="space-y-1">
              {SERIES.map((series) => (
                <li key={series.key} className="flex items-baseline gap-2">
                  <span
                    className={`h-0.5 w-3 shrink-0 rounded-full ${series.line}`}
                    aria-hidden="true"
                  />
                  {/* The value leads: the reader already knows which series they
                      are looking at and came for the number. */}
                  <span className="text-sm font-medium text-foreground">
                    {format.number(active[series.key])}
                  </span>
                  <span className="text-xs text-contrast/60">{t(series.label)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          ref={plotRef}
          role="img"
          tabIndex={0}
          aria-label={t('chartLabel', {
            granularity: tGranularity(granularity),
            from: first ? labelFor(first.period) : '',
            to: last ? labelFor(last.period) : '',
          })}
          onPointerMove={trackPointer}
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex((current) => current ?? 0)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
          className="relative h-40 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
            {rows.map((row, index) => (
              <div
                key={row.period}
                className={cn(
                  'flex h-full flex-1 items-end gap-[2px] rounded-sm transition-colors',
                  index === activeIndex && 'bg-contrast/10',
                )}
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
      </div>

      {first && last && (
        <div className="flex justify-between text-xs text-contrast/50">
          <span>{labelFor(first.period)}</span>
          <span>{labelFor(last.period)}</span>
        </div>
      )}

      {/* The reading a screen reader gets, and the one that survives with the
          pointer nowhere near the chart. */}
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

/**
 * Anchors the tooltip over its column, pinned to whichever edge it is near.
 *
 * Centring every readout pushes the first and last ones off the card, and a
 * tooltip that leaves the screen is worse than one slightly off its mark.
 */
function positionOf(index: number, count: number): { left?: string; right?: string } {
  const centre = ((index + 0.5) / count) * 100;

  if (centre < 20) return { left: '0%' };
  if (centre > 80) return { right: '0%' };

  return { left: `calc(${centre}% - 4rem)` };
}
