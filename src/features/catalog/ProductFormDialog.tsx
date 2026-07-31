'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
  Select,
  useNotify,
} from '@/components/ui';
import { describeError, type Product } from '@/lib/api';
import { useBrands, useCategories, useCreateProduct, useUpdateProduct } from './api';

interface ProductForm {
  name: string;
  categoryId: string;
  brandId: string;
  subcategory: string;
  abv: string;
  origin: string;
  age: string;
  caseSize: string;
  minimumStock: string;
}

const DEFAULT_CASE_SIZE = '12';

function formOf(product: Product | null): ProductForm {
  return {
    name: product?.name ?? '',
    categoryId: product?.category.id ?? '',
    brandId: product?.brand?.id ?? '',
    subcategory: product?.subcategory ?? '',
    abv: product?.abv === null || product === null ? '' : String(product.abv),
    origin: product?.origin ?? '',
    age: product?.age ?? '',
    caseSize: product ? String(product.caseSize) : DEFAULT_CASE_SIZE,
    minimumStock:
      product?.minimumStock === null || product === null ? '' : String(product.minimumStock),
  };
}

/** Empty text is "not set", which the API spells as an absent field. */
const text = (value: string) => value.trim() || undefined;
const number = (value: string) => (value.trim() === '' ? undefined : Number(value));

/**
 * Creates or edits a product. The two share every field but the case size, which
 * only exists at creation: it is the divisor behind every `quantityBase` already
 * written to the ledger, so changing it later would rewrite history.
 *
 * The form is seeded once, on mount, so the caller keys this by product id.
 */
export function ProductFormDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('catalog.form');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const [form, setForm] = useState<ProductForm>(() => formOf(product));
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const notify = useNotify();

  const isEditing = product !== null;
  const isSaving = create.isPending || update.isPending;

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();

    try {
      if (product) {
        await update.mutateAsync({
          id: product.id,
          input: {
            name,
            categoryId: form.categoryId,
            // The update contract has no nullable brand, so a brand can be
            // changed but not cleared. An empty value means "leave it".
            ...(form.brandId ? { brandId: form.brandId } : {}),
            subcategory: text(form.subcategory),
            abv: number(form.abv),
            origin: text(form.origin),
            age: text(form.age),
            minimumStock: number(form.minimumStock),
          },
        });
        notify('success', t('updatedTitle'), t('updatedDescription', { name }));
      } else {
        await create.mutateAsync({
          name,
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          subcategory: text(form.subcategory),
          abv: number(form.abv),
          origin: text(form.origin),
          age: text(form.age),
          caseSize: Number(form.caseSize),
          minimumStock: number(form.minimumStock),
        });
        notify('success', t('createdTitle'), t('createdDescription', { name }));
      }

      onOpenChange(false);
    } catch (error) {
      notify(
        'error',
        isEditing ? t('updateFailed') : t('createFailed'),
        describeError(error, tStates('tryAgain')),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogTitle>
            {isEditing ? t('editTitle', { name: product.name }) : t('createTitle')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <Field label={t('name')} className="sm:col-span-2">
              {({ id }) => (
                <Input
                  id={id}
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder={t('namePlaceholder')}
                />
              )}
            </Field>

            <Field label={t('category')}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.categoryId}
                  onValueChange={(value) => set('categoryId', value)}
                  options={[
                    { value: '', label: t('pickCategory') },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                />
              )}
            </Field>

            <Field
              label={t('brand')}
              hint={isEditing && product.brand ? t('brandHint') : undefined}
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  value={form.brandId}
                  onValueChange={(value) => set('brandId', value)}
                  aria-describedby={describedBy}
                  options={[
                    { value: '', label: t('noBrand') },
                    ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                  ]}
                />
              )}
            </Field>

            <Field label={t('subcategory')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.subcategory}
                  onChange={(event) => set('subcategory', event.target.value)}
                  placeholder={t('subcategoryPlaceholder')}
                />
              )}
            </Field>

            <Field label={t('origin')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.origin}
                  onChange={(event) => set('origin', event.target.value)}
                  placeholder={t('originPlaceholder')}
                />
              )}
            </Field>

            <Field label={t('abv')}>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.abv}
                  onChange={(event) => set('abv', event.target.value)}
                />
              )}
            </Field>

            <Field label={t('age')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.age}
                  onChange={(event) => set('age', event.target.value)}
                  placeholder={t('agePlaceholder')}
                />
              )}
            </Field>

            <Field
              label={t('caseSize')}
              hint={isEditing ? t('caseSizeHintEdit') : t('caseSizeHintNew')}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  required
                  disabled={isEditing}
                  aria-describedby={describedBy}
                  value={form.caseSize}
                  onChange={(event) => set('caseSize', event.target.value)}
                />
              )}
            </Field>

            <Field label={t('minimumStock')} hint={t('minimumStockHint')}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={form.minimumStock}
                  onChange={(event) => set('minimumStock', event.target.value)}
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              isLoading={isSaving}
              disabled={!form.categoryId}
            >
              {isEditing ? tActions('save') : tActions('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
