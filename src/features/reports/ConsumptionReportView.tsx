'use client';

import { useMemo, useState } from 'react';
import { Card, EmptyState, SegmentedControl, Spinner, StatTile } from '@/components/ui';
import { useAuth } from '@/features/auth';
import type { ConsumptionGroupBy, ConsumptionRow } from '@/lib/api';
import { cn, formatNumber, formatShortDate, pluralize } from '@/lib/utils';
import { useConsumptionReport, useSummaryReport } from './api';
import { rangeFor, REPORT_PERIODS, type ReportPeriod } from './range';

const groupings: { value: ConsumptionGroupBy; label: string }[] = [
  { value: 'product', label: 'By product' },
  { value: 'category', label: 'By category' },
  { value: 'brand', label: 'By brand' },
];

const TOP_ROWS = 15;

function ConsumptionBars({ rows }: { rows: ConsumptionRow[] }) {
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
              {formatNumber(row.quantityBase)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-contrast/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-1000 ease-out"
              style={{ width: `${(row.quantityBase / top) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumptionTable({ rows }: { rows: ConsumptionRow[] }) {
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
            <span className="text-sm font-bold text-accent">{formatNumber(row.quantityBase)}</span>
            <span className="hidden text-xs text-contrast/60 sm:inline">
              in {row.movementCount} {pluralize(row.movementCount, 'movement')}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ConsumptionReportView() {
  const { can } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [groupBy, setGroupBy] = useState<ConsumptionGroupBy>('product');

  const range = useMemo(() => rangeFor(period), [period]);

  const consumption = useConsumptionReport(groupBy, range, TOP_ROWS);
  const summary = useSummaryReport(range);

  if (!can('report:read')) {
    return (
      <EmptyState
        title="You cannot see reports."
        description="Ask an administrator for the permission if you need it."
      />
    );
  }

  const rows = consumption.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">Consumption</h1>
        <p className="text-sm text-contrast/60">
          What left the cellar between {formatShortDate(range.from)} and {formatShortDate(range.to)}
          . Aggregated by the API, in SQL.
        </p>
      </header>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <SegmentedControl
          label="Period:"
          value={period}
          options={REPORT_PERIODS}
          onChange={setPeriod}
        />
        <SegmentedControl
          label="Group:"
          value={groupBy}
          options={groupings}
          onChange={setGroupBy}
        />
      </div>

      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Movements" value={formatNumber(summary.data.movements)} />
          <StatTile label="Units dispatched" value={formatNumber(summary.data.unitsOut)} />
          <StatTile label="Units received" value={formatNumber(summary.data.unitsIn)} />
          <StatTile label="Products moved" value={formatNumber(summary.data.productsMoved)} />
        </div>
      )}

      {consumption.isPending ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading the report" />
        </div>
      ) : consumption.error ? (
        <EmptyState
          title="The report could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing was dispatched in this period." />
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="min-w-0 bg-contrast/5">
            <h2 className="mb-4 text-lg font-medium text-accent">Most dispatched</h2>
            <ConsumptionBars rows={rows} />
          </Card>

          <Card className="min-w-0 bg-contrast/5">
            <h2 className="mb-4 text-lg font-medium text-accent">Ranking</h2>
            <ConsumptionTable rows={rows} />
          </Card>
        </div>
      )}
    </div>
  );
}
