import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import { formatDate, getCurrentDateFormatted } from '@/lib/dateUtils';
import {
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Refrigerator,
  Warehouse,
  Plus,
  Minus,
} from 'lucide-react';
import {
  useInventoryWithDetails,
  useUpdateInventoryQuantity,
} from '@/lib/queries/hooks/useInventory';
import { useLocationsWithStats } from '@/lib/queries/hooks/useLocations';

const translateCategory = (categoryName: string) => {
  const directMapping: Record<string, string> = {
    'Food & Beverage': 'Hrana i piće',
    'Food&Beverage': 'Hrana i piće',
    foodbeverage: 'Hrana i piće',
    Cleaning: 'Čišćenje',
    Supplies: 'Potrepštine',
    Toiletries: 'Toaletni artikli',
    Equipment: 'Oprema',
    Office: 'Ured',
  };
  return directMapping[categoryName] ?? categoryName;
};

const getExpirationStatus = (expirationDate: string | null) => {
  if (!expirationDate) return 'none';
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 1) return 'critical';
  if (diffDays <= 7) return 'warning';
  if (diffDays <= 30) return 'info';
  return 'good';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentDateFormatted = useMemo(() => getCurrentDateFormatted(), []);

  const { data: inventory = [], isLoading: inventoryLoading } = useInventoryWithDetails();
  const { data: locations = [], isLoading: locationsLoading } = useLocationsWithStats();
  const updateQuantityMutation = useUpdateInventoryQuantity();

  const stats = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    return {
      totalItems: inventory.length,
      lowStockItems: inventory.filter(
        (item) => item.item && item.quantity <= item.item.minimum_stock
      ).length,
      expiringItems: inventory.filter(
        (item) =>
          item.expiration_date &&
          new Date(item.expiration_date) <= thirtyDaysFromNow &&
          new Date(item.expiration_date) >= today
      ).length,
      locations: locations.length,
    };
  }, [inventory, locations]);

  const sortedInventory = useMemo(
    () =>
      [...inventory].sort((a, b) => {
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
      }),
    [inventory]
  );

  const updateQuantity = (inventoryId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return;
    updateQuantityMutation.mutate({
      inventoryId,
      newQuantity,
      oldQuantity: item.quantity,
      itemName: item.item?.name ?? 'Unknown Item',
    });
  };

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'total':
        navigate({ to: '/global' });
        break;
      case 'lowStock':
        navigate({ to: '/global', search: { filter: 'lowStock' } });
        break;
      case 'expiring':
        navigate({ to: '/global', search: { filter: 'expiring' } });
        break;
      case 'locations':
        navigate({ to: '/locations' });
        break;
    }
  };

  if (inventoryLoading || locationsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-600 lg:text-base">
            {t('dashboard.welcomeBackUser', {
              name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            })}
          </p>
        </div>
        <div className="mt-2 text-left lg:mt-0 lg:text-right">
          <p className="text-sm text-gray-500">{currentDateFormatted}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        <Card
          className="cursor-pointer border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 transition-shadow hover:shadow-md"
          onClick={() => handleCardClick('total')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-blue-800 lg:text-sm">
              {t('dashboard.totalItems')}
            </CardTitle>
            <Package className="h-3 w-3 text-blue-600 lg:h-4 lg:w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-900 lg:text-2xl">{stats.totalItems}</div>
            <p className="text-xs text-blue-600">{t('dashboard.acrossAllLocations')}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 transition-shadow hover:shadow-md"
          onClick={() => handleCardClick('lowStock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-orange-800 lg:text-sm">
              {t('dashboard.lowStock')}
            </CardTitle>
            <AlertTriangle className="h-3 w-3 text-orange-600 lg:h-4 lg:w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-900 lg:text-2xl">
              {stats.lowStockItems}
            </div>
            <p className="text-xs text-orange-600">{t('dashboard.itemsNeedRestocking')}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-red-200 bg-gradient-to-br from-red-50 to-red-100 transition-shadow hover:shadow-md"
          onClick={() => handleCardClick('expiring')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-red-800 lg:text-sm">
              {t('dashboard.expiringSoon')}
            </CardTitle>
            <Clock className="h-3 w-3 text-red-600 lg:h-4 lg:w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-900 lg:text-2xl">{stats.expiringItems}</div>
            <p className="text-xs text-red-600">{t('dashboard.within30Days')}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-green-200 bg-gradient-to-br from-green-50 to-green-100 transition-shadow hover:shadow-md"
          onClick={() => handleCardClick('locations')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-green-800 lg:text-sm">
              {t('dashboard.locations')}
            </CardTitle>
            <Warehouse className="h-3 w-3 text-green-600 lg:h-4 lg:w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-900 lg:text-2xl">{stats.locations}</div>
            <p className="text-xs text-green-600">{t('dashboard.storageLocations')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>{t('dashboard.recentInventory')}</span>
          </CardTitle>
          <CardDescription>{t('dashboard.latestItemsAdjustments')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedInventory.slice(0, 10).map((item) => {
              const expirationStatus = getExpirationStatus(item.expiration_date);
              const isLowStock = item.quantity <= item.item.minimum_stock;

              return (
                <div
                  key={item.id}
                  className="flex flex-col space-y-3 rounded-lg bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0"
                >
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex items-center space-x-2">
                      {item.location.is_refrigerated && (
                        <Refrigerator className="h-4 w-4 flex-shrink-0 text-blue-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{item.item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.location.name} • {translateCategory(item.item.category.name)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                      {isLowStock && (
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                          {t('dashboard.lowStockLabel')}
                        </span>
                      )}
                      {expirationStatus === 'critical' && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                          {t('dashboard.expiresSoon')}
                        </span>
                      )}
                      {expirationStatus === 'warning' && (
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                          {t('dashboard.checkDate')}
                        </span>
                      )}
                      {expirationStatus === 'info' && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                          30 Days
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                    <div className="text-left lg:text-right">
                      <p className="font-medium text-gray-900">
                        {t('dashboard.quantity', { quantity: item.quantity })}
                      </p>
                      {item.expiration_date && (
                        <p className="text-sm text-gray-600">
                          {t('dashboard.expiration', { date: formatDate(item.expiration_date) })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('➖ DASHBOARD DECREMENT BUTTON CLICKED:', {
                            itemId: item.id,
                            currentQuantity: item.quantity,
                            newQuantity: item.quantity - 1,
                            timestamp: new Date().toISOString(),
                            itemName: item.item?.name,
                            locationName: item.location?.name,
                            documentHidden: document.hidden,
                            windowFocused: document.hasFocus(),
                          });
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                        disabled={item.quantity <= 0 || updateQuantityMutation.isPending}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('➕ DASHBOARD INCREMENT BUTTON CLICKED:', {
                            itemId: item.id,
                            currentQuantity: item.quantity,
                            newQuantity: item.quantity + 1,
                            timestamp: new Date().toISOString(),
                            itemName: item.item?.name,
                            locationName: item.location?.name,
                            documentHidden: document.hidden,
                            windowFocused: document.hasFocus(),
                          });
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        disabled={updateQuantityMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
