import { Button, Card, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

export const ADVANCED_FILTER_KEYS = ['brand', 'origin', 'subcategory', 'age', 'abv'] as const;

export type AdvancedFilterKey = (typeof ADVANCED_FILTER_KEYS)[number];
export type AdvancedFilterValues = Record<AdvancedFilterKey, string>;
export type AdvancedFilterOptions = Record<AdvancedFilterKey, string[]>;

export const EMPTY_ADVANCED_FILTERS: AdvancedFilterValues = {
  brand: '',
  origin: '',
  subcategory: '',
  age: '',
  abv: '',
};

const fields: {
  key: AdvancedFilterKey;
  label: string;
  anyLabel: string;
  formatOption?: (value: string) => string;
}[] = [
  { key: 'brand', label: 'Brand', anyLabel: 'All Brands' },
  { key: 'origin', label: 'Origin', anyLabel: 'All Origins' },
  { key: 'subcategory', label: 'Category', anyLabel: 'All Categories' },
  { key: 'age', label: 'Age', anyLabel: 'All Ages' },
  { key: 'abv', label: 'ABV', anyLabel: 'All ABVs', formatOption: (value) => `${value}%` },
];

interface AdvancedFiltersProps {
  values: AdvancedFilterValues;
  options: AdvancedFilterOptions;
  onChange: (key: AdvancedFilterKey, value: string) => void;
  onClear: () => void;
}

export default function AdvancedFilters({
  values,
  options,
  onChange,
  onClear,
}: AdvancedFiltersProps) {
  const hasActiveFilter = ADVANCED_FILTER_KEYS.some((key) => values[key] !== '');

  return (
    <Card className="animate-fade-in-up bg-cardBg/40 sm:rounded-3xl">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {fields.map(({ key, label, anyLabel, formatOption }) => (
          <div key={key}>
            <label
              htmlFor={`advanced-filter-${key}`}
              className="mb-2 block text-xs font-medium uppercase tracking-wider text-contrast/70"
            >
              {label}
            </label>
            <Select
              id={`advanced-filter-${key}`}
              size="sm"
              value={values[key]}
              onValueChange={(value) => onChange(key, value)}
              className={cn(
                'border-contrast/10 bg-contrast/5 hover:border-contrast/20',
                values[key] === '' && 'text-contrast/60',
              )}
              options={[
                { value: '', label: anyLabel },
                ...options[key].map((option) => ({
                  value: option,
                  label: formatOption ? formatOption(option) : option,
                })),
              ]}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClear} disabled={!hasActiveFilter}>
          Clear Advanced
        </Button>
      </div>
    </Card>
  );
}
