import { useState, useEffect, useMemo } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTranslation } from 'react-i18next';
import { Search, Package, MapPin, Refrigerator, Warehouse } from 'lucide-react';
import { useInventoryWithDetails } from '@/lib/queries/hooks/useInventory';

export default function GlobalView() {
  const location = useLocation();
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [perishableFilter, setPerishableFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const { data: inventory = [], isLoading } = useInventoryWithDetails();

  const translateCategory = (categoryName: string) => {
    const key = categoryName.toLowerCase().replace(/\s+/g, '').replace(/&/g, '');
    return t(`categories.${key}`, { defaultValue: categoryName });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filter = searchParams.get('filter');
    if (filter) setActiveFilter(filter);
  }, [location.search]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.item.category.name))),
    [inventory]
  );

  const uniqueLocations = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.location.name))),
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || item.item.category.name === selectedCategory;
      const matchesLocation = selectedLocation === 'all' || item.location.name === selectedLocation;

      let matchesPerishable = true;
      if (perishableFilter === 'perishable') {
        matchesPerishable = item.item.category.requires_expiration ?? false;
      } else if (perishableFilter === 'non-perishable') {
        matchesPerishable = !(item.item.category.requires_expiration ?? false);
      }

      let matchesActiveFilter = true;
      if (activeFilter === 'lowStock') {
        matchesActiveFilter = item.quantity <= (item.item.minimum_stock ?? 0);
      } else if (activeFilter === 'expiring') {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        matchesActiveFilter = !!(
          item.expiration_date &&
          new Date(item.expiration_date) <= sevenDaysFromNow &&
          new Date(item.expiration_date) >= new Date()
        );
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesPerishable &&
        matchesActiveFilter
      );
    });
  }, [inventory, searchTerm, selectedCategory, selectedLocation, perishableFilter, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('global.title')}</h1>
          <div className="flex items-center space-x-2">
            <p className="text-gray-600">{t('global.subtitle')}</p>
            {activeFilter === 'lowStock' && (
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                {t('global.lowStockFilter')}
              </span>
            )}
            {activeFilter === 'expiring' && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                {t('global.expiringFilter')}
              </span>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>
              {t('global.inventoryOverview')} ({filteredInventory.length} of {inventory.length}{' '}
              total)
            </span>
          </CardTitle>
          <CardDescription>{t('global.globalInventoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('global.searchInventory')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('common.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('common.allLocations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allLocations')}</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={perishableFilter} onValueChange={setPerishableFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('global.itemType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('global.allItems')}</SelectItem>
                  <SelectItem value="perishable">{t('global.perishable')}</SelectItem>
                  <SelectItem value="non-perishable">{t('global.nonPerishable')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity <= (item.item.minimum_stock ?? 0);

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between space-y-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:space-y-0"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center space-x-2">
                      <p className="font-medium text-gray-900">{item.item.name}</p>
                      {isLowStock && (
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                          {t('items.lowStock')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.location.name}</span>
                        {item.location.is_refrigerated ? (
                          <Refrigerator className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Warehouse className="h-3 w-3 text-gray-600" />
                        )}
                      </div>
                      <p>{translateCategory(item.item.category.name)}</p>
                      <p>Unit: {item.item.unit}</p>
                      <p>Min: {item.item.minimum_stock}</p>
                    </div>
                    {item.item.description && (
                      <p className="text-sm text-gray-500">{item.item.description}</p>
                    )}
                  </div>

                  <div className="text-center sm:text-right">
                    <div className="flex items-center justify-center space-x-2 sm:justify-end">
                      <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
                      <span className="text-sm text-gray-600">{item.item.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredInventory.length === 0 && (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all' || selectedLocation !== 'all'
                  ? 'No items found matching your filters.'
                  : 'No items found in inventory.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
