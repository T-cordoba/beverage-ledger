'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.categories');
  const tStates = useTranslations('common.states');

  const { data: categories = [], isPending, isError, isFetching, refetch } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const notify = useNotify();

  const report = (error: unknown, title: string) =>
    notify('error', title, describeError(error, tStates('tryAgain')));

  return (
    <TaxonomyView
      copy={{
        title: t('title'),
        subtitle: t('subtitle'),
        newItem: t('new'),
        loadFailed: t('loadFailed'),
        loading: t('loading'),
        empty: t('empty'),
        createTitle: t('form.createTitle'),
        editTitle: (name) => t('form.editTitle', { name }),
        formDescription: t('form.description'),
        deleteTitle: (name) => t('delete.title', { name }),
        deleteDescription: t('delete.description'),
        blockedInUse: (count) => t('delete.blockedInUse', { count }),
      }}
      items={categories}
      isPending={isPending}
      isError={isError}
      isSaving={create.isPending || update.isPending || remove.isPending}
      isRefreshing={isFetching}
      withSortOrder
      onRefresh={() => void refetch()}
      onCreate={async (values: TaxonomyValues) => {
        try {
          await create.mutateAsync(values);
          notify(
            'success',
            t('notify.created'),
            t('notify.createdDescription', { name: values.name }),
          );
        } catch (error) {
          report(error, t('notify.createFailed'));
        }
      }}
      onUpdate={async (id: string, values: TaxonomyValues) => {
        try {
          await update.mutateAsync({ id, input: values });
          notify('success', t('notify.saved'), t('notify.savedDescription', { name: values.name }));
        } catch (error) {
          report(error, t('notify.saveFailed'));
        }
      }}
      onDelete={async (item: TaxonomyItem) => {
        try {
          await remove.mutateAsync(item.id);
          notify(
            'success',
            t('notify.deleted'),
            t('notify.deletedDescription', { name: item.name }),
          );
        } catch (error) {
          report(error, t('notify.deleteFailed'));
        }
      }}
    />
  );
}
