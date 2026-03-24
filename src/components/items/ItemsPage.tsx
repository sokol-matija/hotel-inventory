import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../auth/AuthProvider';
import AddItemDialog from './AddItemDialog';
import EditItemDialog from './EditItemDialog';
import { useTranslation } from 'react-i18next';
import { Package, Plus, Search, Edit, Trash2, DollarSign, AlertTriangle } from 'lucide-react';
import { useItemsWithCounts, useDeleteItem } from '@/lib/queries/hooks/useItems';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';

export default function ItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const translateCategory = (categoryName: string) => {
    const key = categoryName.toLowerCase().replace(/\s+/g, '').replace(/&/g, '');
    return t(`categories.${key}`, { defaultValue: categoryName });
  };

  const { data, isLoading } = useItemsWithCounts();
  const deleteItemMutation = useDeleteItem();

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];

  type ItemType = (typeof items)[number];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemType | null>(null);

  // Sync editingItem with latest data after refetch
  useEffect(() => {
    if (editingItem) {
      const updated = items.find((i) => i.id === editingItem.id);
      if (updated) setEditingItem(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const invalidateItems = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });

  const canAddItem = !!user;
  const canEditItem = !!user;
  const canDeleteItem = !!user;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditItem = (item: ItemType) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const deleteItem = (item: ItemType) => {
    if (!window.confirm(t('items.deleteConfirm'))) return;
    deleteItemMutation.mutate(item);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">You need to be logged in to view items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('items.title')}</h1>
          <p className="text-gray-600">{t('items.subtitle')}</p>
        </div>
        {canAddItem && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('items.addItem')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{t('items.itemsCatalog', { count: filteredItems.length })}</span>
          </CardTitle>
          <CardDescription>{t('items.allItemsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('items.searchItems')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">{t('items.allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {translateCategory(category.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {translateCategory(item.category.name)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      {canEditItem && (
                        <Button size="sm" variant="outline" onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteItem && (
                        <Button size="sm" variant="outline" onClick={() => deleteItem(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="mb-3 text-sm text-gray-600">{item.description}</p>
                  )}

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{item.total_quantity}</div>
                      <div className="text-sm text-gray-600">{t('items.totalStock')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{item.inventory_count}</div>
                      <div className="text-sm text-gray-600">{t('items.locations')}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('items.unit')}:</span>
                      <span className="text-sm font-medium">{item.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('items.minStock')}:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{item.minimum_stock}</span>
                        {item.total_quantity <= (item.minimum_stock ?? 0) && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    {item.price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('items.price')}:</span>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-gray-500" />
                          <span className="text-sm font-medium">{item.price}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    {item.category.requires_expiration && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {t('items.expires')}
                      </span>
                    )}
                    {item.total_quantity <= (item.minimum_stock ?? 0) && (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                        {t('items.lowStock')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all'
                  ? t('items.noItemsFound')
                  : t('items.noItemsYet')}
              </p>
              {canAddItem && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('items.addFirstItem')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onItemAdded={invalidateItems}
      />

      {editingItem && (
        <EditItemDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingItem(null);
          }}
          onItemUpdated={invalidateItems}
          item={editingItem}
        />
      )}
    </div>
  );
}
