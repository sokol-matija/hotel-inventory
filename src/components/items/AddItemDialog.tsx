import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useCategories, useCreateItem } from '@/lib/queries/hooks/useItems';
import { useTranslation } from 'react-i18next';
import { X, Package, DollarSign, Hash, AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

// ─── Schema ────────────────────────────────────────────────────────────────────

const addItemSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'validation.categoryRequired'),
  unit: z.string().min(1, 'validation.unitRequired'),
  price: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0, 'validation.priceNegative').optional()
  ),
  minimum_stock: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(0, 'validation.minStockNegative')
  ),
});

type AddItemFormValues = z.output<typeof addItemSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddItemDialog({ isOpen, onClose, onItemAdded }: AddItemDialogProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemSchema) as Resolver<AddItemFormValues>,
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      unit: 'pieces',
      price: undefined,
      minimum_stock: 0,
    },
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = categoriesData ?? [];
  const createItem = useCreateItem();

  const watchedCategoryId = watch('category_id');

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset({
        name: '',
        description: '',
        category_id: '',
        unit: 'pieces',
        price: undefined,
        minimum_stock: 0,
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (values: AddItemFormValues) => {
    createItem.mutate(
      {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        category_id: parseInt(values.category_id, 10),
        unit: values.unit.trim(),
        price: values.price ?? null,
        minimum_stock: values.minimum_stock,
      },
      {
        onSuccess: () => {
          onItemAdded();
          onClose();
        },
        onError: () => {
          setError('root', { message: t('items.failedToAdd') });
        },
      }
    );
  };

  if (!isOpen) return null;

  const selectedCategory = watchedCategoryId
    ? categories.find((c) => c.id === parseInt(watchedCategoryId, 10))
    : undefined;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('items.addNewItem')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{t('items.addItemDescription')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Name */}
            <div>
              <Label htmlFor="name">{t('items.itemName')} *</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('items.enterItemName')}
                className={errors.name ? 'border-destructive' : ''}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-destructive mt-1 text-sm">{t(errors.name.message ?? '')}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t('common.description')}</Label>
              <textarea
                id="description"
                placeholder={t('items.enterDescription')}
                className="min-h-[80px] w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                {...register('description')}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">{t('common.category')} *</Label>
              {categoriesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="category"
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.category_id ? 'border-destructive' : 'border-gray-300'
                  }`}
                  {...register('category_id')}
                >
                  <option value="">{t('common.selectCategory')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.category_id && (
                <p className="text-destructive mt-1 text-sm">
                  {t(errors.category_id.message ?? '')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Unit */}
              <div>
                <Label htmlFor="unit">{t('common.unit')} *</Label>
                <select
                  id="unit"
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.unit ? 'border-destructive' : 'border-gray-300'
                  }`}
                  {...register('unit')}
                >
                  <option value="pieces">{t('units.pieces')}</option>
                  <option value="kg">{t('units.kg')}</option>
                  <option value="liters">{t('units.liters')}</option>
                  <option value="grams">{t('units.grams')}</option>
                  <option value="bottles">{t('units.bottles')}</option>
                  <option value="boxes">{t('units.boxes')}</option>
                  <option value="packages">{t('units.packages')}</option>
                </select>
                {errors.unit && (
                  <p className="text-destructive mt-1 text-sm">{t(errors.unit.message ?? '')}</p>
                )}
              </div>

              {/* Minimum Stock */}
              <div>
                <Label htmlFor="minimum_stock">{t('common.minStock')} *</Label>
                <div className="relative">
                  <Hash className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="minimum_stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    className={`pl-10 ${errors.minimum_stock ? 'border-destructive' : ''}`}
                    {...register('minimum_stock')}
                  />
                </div>
                {errors.minimum_stock && (
                  <p className="text-destructive mt-1 text-sm">
                    {t(errors.minimum_stock.message ?? '')}
                  </p>
                )}
              </div>
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">{t('items.priceOptional')}</Label>
              <div className="relative">
                <DollarSign className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`pl-10 ${errors.price ? 'border-destructive' : ''}`}
                  {...register('price')}
                />
              </div>
              {errors.price && (
                <p className="text-destructive mt-1 text-sm">{t(errors.price.message ?? '')}</p>
              )}
            </div>

            {/* Expiration Warning */}
            {selectedCategory?.requires_expiration && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center text-sm text-amber-800">
                  <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
                  {t('items.expirationWarning')}
                </p>
              </div>
            )}

            {/* Submit Error */}
            {errors.root && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="flex items-center text-sm text-red-700">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {errors.root.message}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createItem.isPending} className="flex-1">
                {createItem.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t('common.adding')}</span>
                  </div>
                ) : (
                  t('items.addItem')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
