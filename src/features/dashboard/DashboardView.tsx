'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, SegmentedControl, Spinner, StatTile } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { NewMovementActions, RecentMovementsCard } from '@/features/movements';
import {
  granularityFor,
  rangeFor,
  REPORT_PERIODS,
  useActivityReport,
  useSummaryReport,
  type ReportPeriod,
} from '@/features/reports';
import { LowStockCard } from '@/features/stock';
import { formatNumber, formatShortDate, formatSignedNumber } from '@/lib/utils';
import { ActivityChart } from './ActivityChart';

export function DashboardView() {
  const { can, organization } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const range = useMemo(() => rangeFor(period), [period]);
  const granularity = granularityFor(period);

  const canSeeReports = can('report:read');
  const summary = useSummaryReport(range, canSeeReports);
  const activity = useActivityReport(range, granularity, canSeeReports);

  const activityRows = activity.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">
            {organization?.name ?? 'Dashboard'}
          </h1>
          <p className="text-sm text-contrast/60">
            {canSeeReports
              ? `Stock as it stands, and what moved between ${formatShortDate(range.from)} and ${formatShortDate(range.to)}.`
              : 'Stock as it stands, and what has been recorded lately.'}
          </p>
        </div>

        {canSeeReports && (
          <SegmentedControl
            label="Period:"
            value={period}
            options={REPORT_PERIODS}
            onChange={setPeriod}
          />
        )}
      </header>

      <NewMovementActions />

      {canSeeReports &&
        (summary.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" label="Loading the summary" />
          </div>
        ) : summary.error ? (
          <EmptyState
            title="The summary could not be loaded."
            description="Check that the API is reachable and try again."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Units on hand"
              value={formatNumber(summary.data.unitsOnHand)}
              hint="right now"
            />
            <StatTile
              label="Below minimum"
              value={formatNumber(summary.data.productsBelowMinimum)}
              hint="right now"
              tone={summary.data.productsBelowMinimum > 0 ? 'warning' : 'success'}
            />
            <StatTile
              label="Active products"
              value={formatNumber(summary.data.activeProducts)}
              hint="right now"
            />
            <StatTile
              label="Products moved"
              value={formatNumber(summary.data.productsMoved)}
              hint="in the period"
            />
            <StatTile
              label="Movements"
              value={formatNumber(summary.data.movements)}
              hint="confirmed in the period"
            />
            <StatTile
              label="Units received"
              value={formatNumber(summary.data.unitsIn)}
              hint="in the period"
            />
            <StatTile
              label="Units dispatched"
              value={formatNumber(summary.data.unitsOut)}
              hint="in the period"
            />
            <StatTile
              label="Net adjusted"
              value={formatSignedNumber(summary.data.unitsAdjusted)}
              hint="in the period"
              tone={summary.data.unitsAdjusted < 0 ? 'warning' : 'accent'}
            />
          </div>
        ))}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {canSeeReports && (
          <Card className="min-w-0 space-y-4 bg-contrast/5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-accent">Activity</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.reports}>Consumption</Link>
              </Button>
            </div>

            {activity.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner label="Loading the activity" />
              </div>
            ) : activity.error ? (
              <EmptyState title="The activity could not be loaded." />
            ) : activityRows.length === 0 ? (
              <EmptyState title="Nothing moved in this period." />
            ) : (
              <ActivityChart rows={activityRows} granularity={granularity} />
            )}
          </Card>
        )}

        {can('stock:read') && <LowStockCard />}
      </div>

      {can('movement:read') && <RecentMovementsCard />}
    </div>
  );
}
