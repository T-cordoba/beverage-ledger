'use client';

import { useNotify } from '@/components/ui';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/catalog';
import { describeError } from '@/lib/api';
import { TaxonomyView, type TaxonomyItem, type TaxonomyValues } from './TaxonomyView';

export function CategoriesView() {
  const { data: categories = [], isPending, isError } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const notify = useNotify();

  const report = (error: unknown, action: string) =>
    notify('error', `Could not ${action} the category`, describeError(error, 'Please try again.'));

  return (
    <TaxonomyView
      title="Categories"
      description="What a product is: rum, gin, whisky. They used to be loose strings on the product row."
      noun="category"
      items={categories}
      isPending={isPending}
      isError={isError}
      isSaving={create.isPending || update.isPending || remove.isPending}
      withSortOrder
      onCreate={async (values: TaxonomyValues) => {
        try {
          await create.mutateAsync(values);
          notify('success', 'Category created', `${values.name} is available to products.`);
        } catch (error) {
          report(error, 'create');
        }
      }}
      onUpdate={async (id: string, values: TaxonomyValues) => {
        try {
          await update.mutateAsync({ id, input: values });
          notify('success', 'Category saved', `${values.name} was updated.`);
        } catch (error) {
          report(error, 'save');
        }
      }}
      onDelete={async (item: TaxonomyItem) => {
        try {
          await remove.mutateAsync(item.id);
          notify('success', 'Category deleted', `${item.name} is gone.`);
        } catch (error) {
          report(error, 'delete');
        }
      }}
    />
  );
}
