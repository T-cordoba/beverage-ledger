'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Card, EmptyState, SegmentedControl, Skeleton, StatTile } from '@/components/ui';
import type { ConsumptionGroupBy, ConsumptionRow } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useConsumptionReport, useSummaryReport } from './api';
import { rangeFor, REPORT_PERIODS, type ReportPeriod } from './range';

const GROUPINGS: ConsumptionGroupBy[] = ['product', 'category', 'brand'];

const TOP_ROWS = 15;

function ConsumptionBars({ rows }: { rows: ConsumptionRow[] }) {
  const format = useFormatter();
  const top = rows[0]?.quantityBase || 1;

  return (
    <div className="space-y-3">
      {rows.slice(0, 10).map((row) => (
        <div key={row.id} className="w-full min-w-0">
          <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-contrast">
              {row.name}
            </span>
            <span className="shrink-0 text-xs font-medium text-accent">
              {format.number(row.quantityBase)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-contrast/10">
            {/* chart-1, not accent: the interface gold is stepped for text on a
                near-black surface and glares as a large filled area, which is
                what tokens.css says and what this bar is. Flat, not a gradient —
                a gradient across one bar encodes nothing. */}
            <div
              className="h-2 rounded-full bg-chart-1 transition-[width] duration-slow ease-out"
              style={{ width: `${(row.quantityBase / top) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumptionTable({ rows }: { rows: ConsumptionRow[] }) {
  const t = useTranslations('reports');
  const format = useFormatter();

  return (
    <ul className="space-y-2">
      {rows.slice(0, TOP_ROWS).map((row, index) => (
        <li
          key={row.id}
          className={cn(
            'flex min-w-0 items-center justify-between gap-2 rounded-lg p-2 transition-colors sm:p-3',
            index < 3 ? 'border border-accent/20 bg-accent/10' : 'bg-contrast/5',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                index === 0
                  ? 'bg-accent/20 text-accent'
                  : index === 1
                    ? 'bg-contrast/20 text-contrast/70'
                    : index === 2
                      ? 'bg-warning/20 text-warning'
                      : 'bg-contrast/10 text-contrast/60',
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-contrast">{row.name}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-bold text-accent">{format.number(row.quantityBase)}</span>
            <span className="hidden text-xs text-contrast/60 sm:inline">
              {t('inMovements', { count: row.movementCount })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ConsumptionReportView() {
  const t = useTranslations('reports');
  const tStates = useTranslations('common.states');
  const format = useFormatter();

  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [groupBy, setGroupBy] = useState<ConsumptionGroupBy>('product');

  const range = useMemo(() => rangeFor(period), [period]);

  const consumption = useConsumptionReport(groupBy, range, TOP_ROWS);
  const summary = useSummaryReport(range);

  const rows = consumption.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">
          {t('subtitle', {
            from: format.dateTime(new Date(range.from), 'short'),
            to: format.dateTime(new Date(range.to), 'short'),
          })}
        </p>
      </header>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <SegmentedControl
          label={t('periodLabel')}
          value={period}
          options={REPORT_PERIODS.map((value) => ({ value, label: t(`periods.${value}`) }))}
          onChange={setPeriod}
        />
        <SegmentedControl
          label={t('groupLabel')}
          value={groupBy}
          options={GROUPINGS.map((value) => ({ value, label: t(`groupings.${value}`) }))}
          onChange={setGroupBy}
        />
      </div>

      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={t('tiles.movements')} value={format.number(summary.data.movements)} />
          <StatTile label={t('tiles.unitsOut')} value={format.number(summary.data.unitsOut)} />
          <StatTile label={t('tiles.unitsIn')} value={format.number(summary.data.unitsIn)} />
          <StatTile
            label={t('tiles.productsMoved')}
            value={format.number(summary.data.productsMoved)}
          />
        </div>
      )}

      {consumption.isPending ? (
        <div role="status" aria-label={t('loading')} className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : consumption.error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="min-w-0 bg-contrast/5">
            <h2 className="mb-4 text-lg font-medium text-accent">{t('mostDispatched')}</h2>
            <ConsumptionBars rows={rows} />
          </Card>

          <Card className="min-w-0 bg-contrast/5">
            <h2 className="mb-4 text-lg font-medium text-accent">{t('ranking')}</h2>
            <ConsumptionTable rows={rows} />
          </Card>
        </div>
      )}
    </div>
  );
}
