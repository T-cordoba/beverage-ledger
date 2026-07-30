'use client';

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

    try {
      if (product) {
        await update.mutateAsync({
          id: product.id,
          input: {
            name: form.name.trim(),
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
        notify('success', 'Product updated', `${form.name.trim()} was saved.`);
      } else {
        await create.mutateAsync({
          name: form.name.trim(),
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          subcategory: text(form.subcategory),
          abv: number(form.abv),
          origin: text(form.origin),
          age: text(form.age),
          caseSize: Number(form.caseSize),
          minimumStock: number(form.minimumStock),
        });
        notify('success', 'Product created', `${form.name.trim()} joined the catalogue.`);
      }

      onOpenChange(false);
    } catch (error) {
      notify(
        'error',
        isEditing ? 'Could not update the product' : 'Could not create the product',
        describeError(error, 'Please try again.'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogTitle>{isEditing ? `Edit ${product.name}` : 'New product'}</DialogTitle>
          <DialogDescription>
            Products are never deleted, only deactivated: the ledger references them.
          </DialogDescription>

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              {({ id }) => (
                <Input
                  id={id}
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="Havana Club 7 Años"
                />
              )}
            </Field>

            <Field label="Category">
              {({ id }) => (
                <Select
                  id={id}
                  value={form.categoryId}
                  onValueChange={(value) => set('categoryId', value)}
                  options={[
                    { value: '', label: 'Pick a category' },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                />
              )}
            </Field>

            <Field
              label="Brand"
              hint={isEditing && product.brand ? 'A brand can be changed, not removed.' : undefined}
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  value={form.brandId}
                  onValueChange={(value) => set('brandId', value)}
                  aria-describedby={describedBy}
                  options={[
                    { value: '', label: 'No brand' },
                    ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                  ]}
                />
              )}
            </Field>

            <Field label="Subcategory">
              {({ id }) => (
                <Input
                  id={id}
                  value={form.subcategory}
                  onChange={(event) => set('subcategory', event.target.value)}
                  placeholder="Añejo"
                />
              )}
            </Field>

            <Field label="Origin">
              {({ id }) => (
                <Input
                  id={id}
                  value={form.origin}
                  onChange={(event) => set('origin', event.target.value)}
                  placeholder="Cuba"
                />
              )}
            </Field>

            <Field label="ABV (%)">
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

            <Field label="Age">
              {({ id }) => (
                <Input
                  id={id}
                  value={form.age}
                  onChange={(event) => set('age', event.target.value)}
                  placeholder="7 años"
                />
              )}
            </Field>

            <Field
              label="Case size"
              hint={
                isEditing
                  ? 'Fixed after creation: it is the divisor behind every quantity already recorded.'
                  : 'Singles per case. Quantities are normalized with it.'
              }
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

            <Field
              label="Minimum stock"
              hint="Reorder threshold, in singles. Empty means no alert."
            >
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
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              isLoading={isSaving}
              disabled={!form.categoryId}
            >
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
