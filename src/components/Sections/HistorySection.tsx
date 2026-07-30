import type { Movimiento } from '@/app/actions';
import Calendar from '@/components/Calendar';
import MovementCard from '@/components/MovementCard';
import { EmptyState, Input, Spinner } from '@/components/ui';
import { formatLongDate, parseDateKey, toDateKey } from '@/lib/utils';

interface HistorySectionProps {
  movimientos: Movimiento[];
  loadingMovimientos: boolean;
  movementSearchTerm: string;
  dateFilter: string;
  expandedMovements: Set<string>;
  onSearchChange: (value: string) => void;
  setDateFilter: (date: string) => void;
  onToggleExpansion: (id: string) => void;
}

export default function HistorySection({
  movimientos,
  loadingMovimientos,
  movementSearchTerm,
  dateFilter,
  expandedMovements,
  onSearchChange,
  setDateFilter,
  onToggleExpansion,
}: HistorySectionProps) {
  const filteredMovimientos = movimientos.filter((movimiento) => {
    const matchesCode =
      !movementSearchTerm || movimiento.id.toLowerCase().includes(movementSearchTerm.toLowerCase());
    const matchesDate = !dateFilter || toDateKey(movimiento.date) === dateFilter;

    return matchesCode && matchesDate;
  });

  const describeActiveFilters = () => {
    const parts: string[] = [];
    if (movementSearchTerm) parts.push(`"${movementSearchTerm}"`);
    if (dateFilter) parts.push(`date "${formatLongDate(parseDateKey(dateFilter))}"`);
    return parts.join(' and ');
  };

  return (
    <section className="space-y-6 lg:space-y-8">
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center lg:mb-8">
        <h2 className="text-xl font-light text-foreground sm:text-2xl">Movement History</h2>
        <div className="text-xs font-light text-contrast/60 sm:text-sm">
          {filteredMovimientos.length} of {movimientos.length} movements{' '}
          {movementSearchTerm || dateFilter ? 'found' : 'total'}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          type="text"
          placeholder="Search by movement code..."
          value={movementSearchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search by movement code"
          className="border-contrast/20 bg-background/50 backdrop-blur-sm"
          trailing={
            <svg
              className="h-4 w-4 text-contrast/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />

        <Calendar dateFilter={dateFilter} setDateFilter={setDateFilter} />
      </div>

      {!movementSearchTerm && !dateFilter && (
        <p className="text-xs text-contrast/50">
          Search by movement code or filter by specific date
        </p>
      )}

      {loadingMovimientos ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading movements" />
        </div>
      ) : movimientos.length === 0 ? (
        <EmptyState title="No movements recorded." />
      ) : filteredMovimientos.length === 0 ? (
        <EmptyState title={`No movements found matching ${describeActiveFilters()}.`} />
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {filteredMovimientos.map((movimiento) => (
            <MovementCard
              key={movimiento.id}
              movimiento={movimiento}
              isExpanded={expandedMovements.has(movimiento.id)}
              onToggleExpansion={onToggleExpansion}
            />
          ))}
        </div>
      )}
    </section>
  );
}
