'use client';

import { useTranslations } from 'next-intl';
import { useNotify } from '@/components/ui';
import { useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from '@/features/catalog';
import { describeError } from '@/lib/api';
import { TaxonomyView, type TaxonomyItem, type TaxonomyValues } from './TaxonomyView';

export function BrandsView() {
  const t = useTranslations('admin.brands');
  const tStates = useTranslations('common.states');

  const { data: brands = [], isPending, isError, isFetching, refetch } = useBrands();
  const create = useCreateBrand();
  const update = useUpdateBrand();
  const remove = useDeleteBrand();
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
      items={brands}
      isPending={isPending}
      isError={isError}
      isSaving={create.isPending || update.isPending || remove.isPending}
      isRefreshing={isFetching}
      onRefresh={() => void refetch()}
      onCreate={async ({ name }: TaxonomyValues) => {
        try {
          await create.mutateAsync({ name });
          notify('success', t('notify.created'), t('notify.createdDescription', { name }));
        } catch (error) {
          report(error, t('notify.createFailed'));
        }
      }}
      onUpdate={async (id: string, { name }: TaxonomyValues) => {
        try {
          await update.mutateAsync({ id, input: { name } });
          notify('success', t('notify.saved'), t('notify.savedDescription', { name }));
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
