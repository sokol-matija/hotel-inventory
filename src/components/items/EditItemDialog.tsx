import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCategories, useUpdateItem, type ItemWithCategory } from '@/lib/queries/hooks/useItems';
import { useTranslation } from 'react-i18next';
import { Package, Loader2 } from 'lucide-react';

interface EditItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  item: ItemWithCategory;
}

export default function EditItemDialog({
  isOpen,
  onClose,
  onItemUpdated,
  item,
}: EditItemDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    price: '',
    minimum_stock: '',
    category_id: '',
  });

  const { data: categoriesData, isLoading } = useCategories();
  const categories = categoriesData ?? [];
  const updateItem = useUpdateItem();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: item.name,
        description: item.description || '',
        unit: item.unit ?? '',
        price: item.price?.toString() || '',
        minimum_stock: (item.minimum_stock ?? 0).toString(),
        category_id: item.category_id.toString(),
      });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newData = {
      name: formData.name,
      description: formData.description || null,
      unit: formData.unit,
      price: formData.price ? parseFloat(formData.price) : null,
      minimum_stock: parseInt(formData.minimum_stock),
      category_id: parseInt(formData.category_id),
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
          alert('Error updating item. Please try again.');
        },
      }
    );
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Edit Item</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('items.enterItemName')}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('items.enterDescription')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="e.g., pieces, kg, liters"
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="minimum_stock">Minimum Stock *</Label>
            <Input
              id="minimum_stock"
              type="number"
              min="0"
              value={formData.minimum_stock}
              onChange={(e) => handleChange('minimum_stock', e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            {isLoading ? (
              <div className="flex items-center space-x-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : (
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleChange('category_id', value)}
              >
                <SelectTrigger>
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
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateItem.isPending}>
              {updateItem.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
