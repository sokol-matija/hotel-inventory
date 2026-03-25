import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCategories, useUpdateItem, type ItemWithCategory } from '@/lib/queries/hooks/useItems';
import { useTranslation } from 'react-i18next';
import { Package, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

// ─── Schema ────────────────────────────────────────────────────────────────────

const editItemSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  description: z.string().optional(),
  unit: z.string().min(1, 'validation.unitRequired'),
  price: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0, 'validation.priceNegative').optional()
  ),
  minimum_stock: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(0, 'validation.minStockNegative')
  ),
  category_id: z.string().min(1, 'validation.categoryRequired'),
});

type EditItemFormValues = z.output<typeof editItemSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EditItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  item: ItemWithCategory;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EditItemDialog({
  isOpen,
  onClose,
  onItemUpdated,
  item,
}: EditItemDialogProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditItemFormValues>({
    resolver: zodResolver(editItemSchema) as Resolver<EditItemFormValues>,
    defaultValues: {
      name: item.name,
      description: item.description ?? '',
      unit: item.unit ?? '',
      price: item.price ?? undefined,
      minimum_stock: item.minimum_stock ?? 0,
      category_id: item.category_id.toString(),
    },
  });

  const { data: categoriesData, isLoading } = useCategories();
  const categories = categoriesData ?? [];
  const updateItem = useUpdateItem();

  const watchedCategoryId = watch('category_id');

  // Re-populate form whenever the dialog opens with a (possibly new) item
  useEffect(() => {
    if (isOpen) {
      reset({
        name: item.name,
        description: item.description ?? '',
        unit: item.unit ?? '',
        price: item.price ?? undefined,
        minimum_stock: item.minimum_stock ?? 0,
        category_id: item.category_id.toString(),
      });
    }
  }, [isOpen, item, reset]);

  const onSubmit = (values: EditItemFormValues) => {
    const newData = {
      name: values.name,
      description: values.description || null,
      unit: values.unit,
      price: values.price ?? null,
      minimum_stock: values.minimum_stock,
      category_id: parseInt(values.category_id, 10),
    };

    updateItem.mutate(
      {
        id: item.id,
        data: newData,
        oldData: {
          name: item.name,
          description: item.description,
          unit: item.unit,
          price: item.price,
          minimum_stock: item.minimum_stock,
          category_id: item.category_id,
        },
      },
      {
        onSuccess: () => {
          onItemUpdated();
          onClose();
        },
        onError: (error) => {
          console.error('Error updating item:', error);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{t('items.editItem')}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Name */}
          <div>
            <Label htmlFor="edit-name">{t('items.itemName')} *</Label>
            <Input
              id="edit-name"
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
            <Label htmlFor="edit-description">{t('common.description')}</Label>
            <Textarea
              id="edit-description"
              placeholder={t('items.enterDescription')}
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Unit */}
            <div>
              <Label htmlFor="edit-unit">{t('common.unit')} *</Label>
              <Input
                id="edit-unit"
                placeholder="e.g., pieces, kg, liters"
                className={errors.unit ? 'border-destructive' : ''}
                {...register('unit')}
              />
              {errors.unit && (
                <p className="text-destructive mt-1 text-sm">{t(errors.unit.message ?? '')}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="edit-price">{t('items.priceOptional')}</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                className={errors.price ? 'border-destructive' : ''}
                {...register('price')}
              />
              {errors.price && (
                <p className="text-destructive mt-1 text-sm">{t(errors.price.message ?? '')}</p>
              )}
            </div>
          </div>

          {/* Minimum Stock */}
          <div>
            <Label htmlFor="edit-minimum_stock">{t('common.minStock')} *</Label>
            <Input
              id="edit-minimum_stock"
              type="number"
              min="0"
              placeholder="0"
              className={errors.minimum_stock ? 'border-destructive' : ''}
              {...register('minimum_stock')}
            />
            {errors.minimum_stock && (
              <p className="text-destructive mt-1 text-sm">
                {t(errors.minimum_stock.message ?? '')}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="edit-category">{t('common.category')} *</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={watchedCategoryId}
                onValueChange={(value) => setValue('category_id', value, { shouldValidate: true })}
              >
                <SelectTrigger className={errors.category_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('common.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.category_id && (
              <p className="text-destructive mt-1 text-sm">{t(errors.category_id.message ?? '')}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateItem.isPending}>
              {updateItem.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.updating')}
                </>
              ) : (
                t('items.updateItem')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
