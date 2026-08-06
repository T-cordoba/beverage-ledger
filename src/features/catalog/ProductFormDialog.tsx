'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  FormAlert,
  Input,
  Select,
  useNotify,
} from '@/components/ui';
import { describeError, type Product } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
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

  const validation = useFormValidation({
    name: rules.text(form.name, { minLength: 2 }),
    categoryId: rules.chosen(form.categoryId),
    abv: rules.numeric(form.abv, { min: 0, max: 100 }),
    minimumStock: rules.numeric(form.minimumStock, { min: 0, integer: true }),
    // Only ever filled in at creation: on an edit the control is disabled
    // because the case size is the divisor behind every quantity already in the
    // ledger.
    caseSize: isEditing
      ? undefined
      : rules.numeric(form.caseSize, { optional: false, min: 1, integer: true }),
  });

  const submit = async () => {
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
        <form
          ref={validation.ref}
          noValidate
          onSubmit={validation.onSubmit(() => void submit())}
          className="space-y-4"
        >
          <DialogTitle>
            {isEditing ? t('editTitle', { name: product.name }) : t('createTitle')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          {validation.alert && <FormAlert title={validation.alert} />}

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <Field label={t('name')} className="sm:col-span-2" error={validation.errorFor('name')}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  required
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  onBlur={() => validation.touch('name')}
                  placeholder={t('namePlaceholder')}
                />
              )}
            </Field>

            <Field label={t('category')} error={validation.errorFor('categoryId')}>
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  value={form.categoryId}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  // A Radix trigger has no blur to hang this on, and picking the
                  // placeholder back is exactly the moment worth reporting.
                  onValueChange={(value) => {
                    set('categoryId', value);
                    validation.touch('categoryId');
                  }}
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

            <Field label={t('abv')} error={validation.errorFor('abv')}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={form.abv}
                  onChange={(event) => set('abv', event.target.value)}
                  onBlur={() => validation.touch('abv')}
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
              error={validation.errorFor('caseSize')}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  required
                  disabled={isEditing}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={form.caseSize}
                  onChange={(event) => set('caseSize', event.target.value)}
                  onBlur={() => validation.touch('caseSize')}
                />
              )}
            </Field>

            <Field
              label={t('minimumStock')}
              hint={t('minimumStockHint')}
              error={validation.errorFor('minimumStock')}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={form.minimumStock}
                  onChange={(event) => set('minimumStock', event.target.value)}
                  onBlur={() => validation.touch('minimumStock')}
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="sm:flex-1"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            {/* Not disabled while the category is missing: a dead button says
                nothing about why. Submitting is what points at the field. */}
            <Button type="submit" size="lg" className="sm:flex-1" isLoading={isSaving}>
              {isEditing ? tActions('save') : tActions('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
