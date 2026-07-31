'use client';

import { useFormatter, useTranslations } from 'next-intl';
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
import { ActivityChart } from './ActivityChart';

export function DashboardView() {
  const t = useTranslations('dashboard');
  const tReports = useTranslations('reports');
  const tStates = useTranslations('common.states');
  const format = useFormatter();

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
          {/* The tenant's name is the heading here: this is their operation. */}
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">
            {organization?.name ?? t('title')}
          </h1>
          <p className="text-sm text-contrast/60">
            {canSeeReports
              ? t('subtitleWithReports', {
                  from: format.dateTime(new Date(range.from), 'short'),
                  to: format.dateTime(new Date(range.to), 'short'),
                })
              : t('subtitle')}
          </p>
        </div>

        {canSeeReports && (
          <SegmentedControl
            label={tReports('periodLabel')}
            value={period}
            options={REPORT_PERIODS.map((value) => ({
              value,
              label: tReports(`periods.${value}`),
            }))}
            onChange={setPeriod}
          />
        )}
      </header>

      <NewMovementActions />

      {canSeeReports &&
        (summary.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" label={t('loadingSummary')} />
          </div>
        ) : summary.error ? (
          <EmptyState title={t('summaryFailed')} description={tStates('apiUnreachable')} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t('tiles.unitsOnHand')}
              value={format.number(summary.data.unitsOnHand)}
              hint={t('hints.now')}
            />
            <StatTile
              label={t('tiles.belowMinimum')}
              value={format.number(summary.data.productsBelowMinimum)}
              hint={t('hints.now')}
              tone={summary.data.productsBelowMinimum > 0 ? 'warning' : 'success'}
            />
            <StatTile
              label={t('tiles.activeProducts')}
              value={format.number(summary.data.activeProducts)}
              hint={t('hints.now')}
            />
            <StatTile
              label={t('tiles.productsMoved')}
              value={format.number(summary.data.productsMoved)}
              hint={t('hints.period')}
            />
            <StatTile
              label={t('tiles.movements')}
              value={format.number(summary.data.movements)}
              hint={t('hints.confirmedInPeriod')}
            />
            <StatTile
              label={t('tiles.unitsIn')}
              value={format.number(summary.data.unitsIn)}
              hint={t('hints.period')}
            />
            <StatTile
              label={t('tiles.unitsOut')}
              value={format.number(summary.data.unitsOut)}
              hint={t('hints.period')}
            />
            <StatTile
              label={t('tiles.netAdjusted')}
              value={format.number(summary.data.unitsAdjusted, 'signed')}
              hint={t('hints.period')}
              tone={summary.data.unitsAdjusted < 0 ? 'warning' : 'accent'}
            />
          </div>
        ))}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {canSeeReports && (
          <Card className="min-w-0 space-y-4 bg-contrast/5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-accent">{t('activity.title')}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.reports}>{t('activity.link')}</Link>
              </Button>
            </div>

            {activity.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner label={t('activity.loading')} />
              </div>
            ) : activity.error ? (
              <EmptyState title={t('activity.loadFailed')} />
            ) : activityRows.length === 0 ? (
              <EmptyState title={t('activity.empty')} />
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
