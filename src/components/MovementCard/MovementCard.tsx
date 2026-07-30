import type { Movimiento } from '@/app/actions';
import { Badge, Button } from '@/components/ui';
import { cn, formatDateTime, formatShortDate, pluralize } from '@/lib/utils';

interface MovementCardProps {
  movimiento: Movimiento;
  isExpanded: boolean;
  onToggleExpansion: (id: string) => void;
}

const COLLAPSED_ITEM_COUNT = 3;

export default function MovementCard({
  movimiento,
  isExpanded,
  onToggleExpansion,
}: MovementCardProps) {
  const hasMoreLiquors = movimiento.liquors.length > COLLAPSED_ITEM_COUNT;
  const displayLiquors = isExpanded
    ? movimiento.liquors
    : movimiento.liquors.slice(0, COLLAPSED_ITEM_COUNT);

  const handlePDFDownload = () => {
    const date = encodeURIComponent(formatShortDate(movimiento.date));
    window.open(`/api/movimientos/${movimiento.id}/pdf?date=${date}`, '_blank');
  };

  return (
    <div className="overflow-hidden rounded-xl border border-contrast/10 bg-contrast/5 backdrop-blur-sm transition-colors hover:bg-contrast/10 sm:rounded-2xl">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-lg font-medium text-accent sm:text-xl">Movement</h3>
            <div className="space-y-1">
              <Badge className="font-mono text-foreground">{movimiento.id}</Badge>
              <div className="text-sm font-light text-contrast/60 sm:text-base">
                {formatDateTime(movimiento.date)}
              </div>
              <div className="text-xs font-light text-contrast/50 sm:text-sm">
                {movimiento.liquors.length} {pluralize(movimiento.liquors.length, 'item')}
              </div>
            </div>
          </div>
          <Button
            onClick={handlePDFDownload}
            className="group w-full min-w-[100px] sm:w-auto"
            title="View PDF Invoice"
          >
            <svg
              className="h-4 w-4 shrink-0 transition-transform duration-base group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            PDF
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className={cn('overflow-hidden transition-all', !isExpanded && 'max-h-[180px]')}>
            {displayLiquors.map((licor, index) => (
              <div
                key={`${movimiento.id}-${index}`}
                className="flex items-start justify-between border-b border-contrast/5 py-3 last:border-b-0"
              >
                <div className="flex flex-1 flex-col space-y-1">
                  <span className="font-medium text-contrast">{licor.name}</span>
                  <span className="text-xs text-contrast/60">{licor.type}</span>
                  {licor.brand && (
                    <span className="text-xs text-accent/70">Brand: {licor.brand}</span>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-contrast/50">
                    {licor.origin && <span>Origin: {licor.origin}</span>}
                    {licor.abv && <span>ABV: {licor.abv}%</span>}
                    {licor.age && <span>Age: {licor.age}</span>}
                    {licor.subcategory && <span>Category: {licor.subcategory}</span>}
                  </div>
                </div>
                <span className="ml-4 text-right font-medium text-accent">
                  {licor.quantity} {pluralize(licor.quantity, licor.unit)}
                </span>
              </div>
            ))}
          </div>

          {hasMoreLiquors && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => onToggleExpansion(movimiento.id)}
              className="group mt-3 w-full rounded-lg hover:border-accent/30 hover:text-accent"
            >
              {isExpanded
                ? 'Show less'
                : `Show ${movimiento.liquors.length - COLLAPSED_ITEM_COUNT} more items`}
              <svg
                className={cn(
                  'h-4 w-4 transition-transform duration-slow group-hover:scale-110',
                  isExpanded && 'rotate-180',
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
