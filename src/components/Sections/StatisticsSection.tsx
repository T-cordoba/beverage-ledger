import { Button, EmptyState, Spinner } from '@/components/ui';
import { cn, pluralize } from '@/lib/utils';

type StatisticsData = { name: string; quantity: number };

interface StatisticsSectionProps {
  statisticsData: StatisticsData[];
  statisticsTimeRange: 'week' | 'month' | 'year';
  statisticsView: 'liquor' | 'type';
  loadingStatistics: boolean;
  onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
  onViewChange: (view: 'liquor' | 'type') => void;
}

const timeRanges = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

const views = [
  { value: 'liquor', label: 'By Liquor' },
  { value: 'type', label: 'By Type' },
] as const;

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto">
      <span className="shrink-0 text-sm font-medium text-contrast/80">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-border bg-cardBg/80">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-none',
              value === option.value
                ? 'bg-accent text-background hover:bg-accent-hover'
                : 'bg-background/50 hover:bg-background/70',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function StatisticsSection({
  statisticsData,
  statisticsTimeRange,
  statisticsView,
  loadingStatistics,
  onTimeRangeChange,
  onViewChange,
}: StatisticsSectionProps) {
  return (
    <section className="w-full max-w-full space-y-6 overflow-hidden lg:space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-light text-foreground sm:text-2xl">Statistics</h2>
        <p className="mt-2 text-sm text-contrast/60 sm:text-base">
          Analyze liquor consumption patterns and trends
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:gap-6 sm:px-0">
        <SegmentedControl
          label="Period:"
          value={statisticsTimeRange}
          options={timeRanges}
          onChange={onTimeRangeChange}
        />
        <SegmentedControl
          label="View:"
          value={statisticsView}
          options={views}
          onChange={onViewChange}
        />
      </div>

      {loadingStatistics ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading statistics" />
        </div>
      ) : statisticsData && statisticsData.length > 0 ? (
        <div className="grid w-full max-w-full gap-4 overflow-hidden sm:gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0 rounded-xl border border-contrast/10 bg-contrast/5 p-4 backdrop-blur-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-4 text-lg font-medium text-accent">
              Most Requested {statisticsView === 'liquor' ? 'Liquors' : 'Types'}
            </h3>
            <div className="space-y-3">
              {statisticsData.slice(0, 10).map((item, index) => {
                const maxQuantity = statisticsData[0]?.quantity || 1;
                const percentage = (item.quantity / maxQuantity) * 100;

                return (
                  <div key={item.name} className="relative w-full min-w-0">
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-contrast">
                        {item.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-accent">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-contrast/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {index < 3 && (
                      <div className="absolute -left-2 top-0 h-8 w-1 rounded-full bg-accent/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-contrast/10 bg-contrast/5 p-4 backdrop-blur-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-4 text-lg font-medium text-accent">Leaderboard</h3>
            <div className="space-y-2">
              {statisticsData.slice(0, 15).map((item, index) => (
                <div
                  key={item.name}
                  className={cn(
                    'flex min-w-0 items-center justify-between gap-2 rounded-lg p-2 transition-colors sm:p-3',
                    index < 3
                      ? 'border border-accent/20 bg-accent/10'
                      : 'bg-contrast/5 hover:bg-contrast/10',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <div
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
                    </div>
                    <span className="min-w-0 truncate text-sm font-medium text-contrast">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <span className="text-sm font-bold text-accent">{item.quantity}</span>
                    <span className="hidden text-xs text-contrast/60 sm:inline">
                      {pluralize(item.quantity, 'unit')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="No data available for the selected period" />
      )}
    </section>
  );
}
