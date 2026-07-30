'use client';

import { useNotify } from '@/components/ui';
import { useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from '@/features/catalog';
import { describeError } from '@/lib/api';
import { TaxonomyView, type TaxonomyItem, type TaxonomyValues } from './TaxonomyView';

export function BrandsView() {
  const { data: brands = [], isPending, isError } = useBrands();
  const create = useCreateBrand();
  const update = useUpdateBrand();
  const remove = useDeleteBrand();
  const notify = useNotify();

  const report = (error: unknown, action: string) =>
    notify('error', `Could not ${action} the brand`, describeError(error, 'Please try again.'));

  return (
    <TaxonomyView
      title="Brands"
      description="Who makes it. A product may have none, which is why the field is optional."
      noun="brand"
      items={brands}
      isPending={isPending}
      isError={isError}
      isSaving={create.isPending || update.isPending || remove.isPending}
      onCreate={async ({ name }: TaxonomyValues) => {
        try {
          await create.mutateAsync({ name });
          notify('success', 'Brand created', `${name} is available to products.`);
        } catch (error) {
          report(error, 'create');
        }
      }}
      onUpdate={async (id: string, { name }: TaxonomyValues) => {
        try {
          await update.mutateAsync({ id, input: { name } });
          notify('success', 'Brand saved', `${name} was updated.`);
        } catch (error) {
          report(error, 'save');
        }
      }}
      onDelete={async (item: TaxonomyItem) => {
        try {
          await remove.mutateAsync(item.id);
          notify('success', 'Brand deleted', `${item.name} is gone.`);
        } catch (error) {
          report(error, 'delete');
        }
      }}
    />
  );
}
