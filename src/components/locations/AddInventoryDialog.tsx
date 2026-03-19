import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '@/lib/supabase';
import { X, Package, Hash, Calendar, DollarSign, AlertCircle, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveItems } from '@/lib/queries/hooks/useItems';
import { queryKeys } from '@/lib/queries/queryKeys';

interface AddInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInventoryAdded: () => void;
  locationId: number;
}

export default function AddInventoryDialog({
  isOpen,
  onClose,
  onInventoryAdded,
  locationId,
}: AddInventoryDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '1',
    expiration_date: '',
    cost_per_unit: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useManualDateEntry, setUseManualDateEntry] = useState(() => window.innerWidth <= 768);

  const { data: items = [] } = useActiveItems(isOpen);

  const selectedItem = formData.item_id
    ? (items.find((i) => i.id === parseInt(formData.item_id)) ?? null)
    : null;

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ item_id: '', quantity: '1', expiration_date: '', cost_per_unit: '' });
      setErrors({});
      setUseManualDateEntry(window.innerWidth <= 768);
    }
  }, [isOpen]);

  const translateCategory = (categoryName: string) => {
    const key = categoryName.toLowerCase().replace(/\s+/g, '').replace(/&/g, '');
    return t(`categories.${key}`, { defaultValue: categoryName });
  };

  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForDatabase = (displayDate: string): string => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const [day, month] = parts;
    let year = parts[2];
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const twoDigitYear = parseInt(year, 10);
      year = (currentCentury + twoDigitYear).toString();
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const validateDateFormat = (dateString: string): boolean => {
    if (!dateString) return false;
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
    const match = dateString.match(dateRegex);
    if (!match) return false;
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    let yearNum = parseInt(year, 10);
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      yearNum = currentCentury + yearNum;
    }
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;
    if (yearNum < 1900 || yearNum > 2100) return false;
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return (
      date.getFullYear() === yearNum &&
      date.getMonth() === monthNum - 1 &&
      date.getDate() === dayNum
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.item_id) newErrors.item_id = t('validation.itemRequired');
    if (!formData.quantity || parseInt(formData.quantity) <= 0)
      newErrors.quantity = t('validation.quantityPositive');
    if (selectedItem?.category.requires_expiration) {
      if (!formData.expiration_date) {
        newErrors.expiration_date = t('addInventory.expirationRequired');
      } else if (useManualDateEntry && !validateDateFormat(formData.expiration_date)) {
        newErrors.expiration_date = t('addInventory.dateFormatError');
      }
    }
    if (formData.cost_per_unit && parseFloat(formData.cost_per_unit) < 0)
      newErrors.cost_per_unit = t('validation.priceNegative');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addInventoryMutation = useMutation({
    mutationFn: async (payload: {
      item_id: number;
      location_id: number;
      quantity: number;
      expiration_date: string | null;
      cost_per_unit: number | null;
    }) => {
      const { data: maxOrderData } = await supabase
        .from('inventory')
        .select('display_order')
        .eq('location_id', locationId)
        .order('display_order', { ascending: false })
        .limit(1);
      const nextDisplayOrder =
        maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order + 1 : 1;

      const { error } = await supabase
        .from('inventory')
        .insert([{ ...payload, display_order: nextDisplayOrder }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.locations.detail(String(locationId)),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
      onInventoryAdded();
      onClose();
    },
    onError: () => {
      setErrors({ submit: t('addInventory.addError') });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let expirationDate = formData.expiration_date;
    if (useManualDateEntry && formData.expiration_date) {
      expirationDate = formatDateForDatabase(formData.expiration_date);
    }

    addInventoryMutation.mutate({
      item_id: parseInt(formData.item_id),
      location_id: locationId,
      quantity: parseInt(formData.quantity),
      expiration_date: expirationDate || null,
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleDateInputChange = (value: string) => {
    let formattedValue = value.replace(/\D/g, '');
    if (formattedValue.length >= 2)
      formattedValue = formattedValue.substring(0, 2) + '/' + formattedValue.substring(2);
    if (formattedValue.length >= 5)
      formattedValue = formattedValue.substring(0, 5) + '/' + formattedValue.substring(5);
    if (formattedValue.length > 10) formattedValue = formattedValue.substring(0, 10);
    setFormData((prev) => ({ ...prev, expiration_date: formattedValue }));
    if (errors.expiration_date) setErrors((prev) => ({ ...prev, expiration_date: '' }));
  };

  const handleDateModeToggle = () => {
    const newManualMode = !useManualDateEntry;
    setUseManualDateEntry(newManualMode);
    if (formData.expiration_date) {
      if (newManualMode) {
        setFormData((prev) => ({
          ...prev,
          expiration_date: formatDateForDisplay(formData.expiration_date),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          expiration_date: formatDateForDatabase(formData.expiration_date),
        }));
      }
    }
    if (errors.expiration_date) setErrors((prev) => ({ ...prev, expiration_date: '' }));
  };

  if (!isOpen) return null;

  const loading = addInventoryMutation.isPending;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('addInventory.title')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{t('addInventory.description')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Selection */}
            <div>
              <Label htmlFor="item">{t('addInventory.selectItem')} *</Label>
              <select
                id="item"
                value={formData.item_id}
                onChange={(e) => handleInputChange('item_id', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.item_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('addInventory.chooseItem')}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({translateCategory(item.category.name)})
                  </option>
                ))}
              </select>
              {errors.item_id && (
                <p className="mt-1 flex items-center text-sm text-red-500">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {errors.item_id}
                </p>
              )}
            </div>

            {/* Show item details if selected */}
            {selectedItem && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>{t('common.unit')}:</strong> {selectedItem.unit}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>{t('common.category')}:</strong>{' '}
                  {translateCategory(selectedItem.category.name)}
                </p>
                {selectedItem.category.requires_expiration && (
                  <p className="text-sm text-blue-800">
                    <strong>{t('addInventory.note')}:</strong> {t('addInventory.expirationNote')}
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">{t('common.quantity')} *</Label>
              <div className="relative">
                <Hash className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="1"
                  className={`pl-10 ${errors.quantity ? 'border-red-500' : ''}`}
                />
                {selectedItem && (
                  <span className="absolute top-3 right-3 text-sm text-gray-500">
                    {selectedItem.unit}
                  </span>
                )}
              </div>
              {errors.quantity && (
                <p className="mt-1 flex items-center text-sm text-red-500">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {errors.quantity}
                </p>
              )}
            </div>

            {/* Expiration Date (if required) */}
            {selectedItem?.category.requires_expiration && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label htmlFor="expiration_date">{t('addInventory.expirationDate')} *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDateModeToggle}
                    className="h-auto px-2 py-1 text-xs"
                  >
                    {useManualDateEntry ? (
                      <>
                        <Calendar className="mr-1 h-3 w-3" />
                        {t('addInventory.datePicker')}
                      </>
                    ) : (
                      <>
                        <Type className="mr-1 h-3 w-3" />
                        {t('addInventory.manualEntry')}
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  {useManualDateEntry ? (
                    <>
                      <Type className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="expiration_date"
                        type="text"
                        value={formData.expiration_date}
                        onChange={(e) => handleDateInputChange(e.target.value)}
                        placeholder={t('addInventory.dateFormat')}
                        className={`pl-10 ${errors.expiration_date ? 'border-red-500' : ''}`}
                        maxLength={10}
                      />
                      <span className="absolute top-3 right-3 text-xs text-gray-400">
                        {t('addInventory.dateFormat')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="expiration_date"
                        type="date"
                        value={formData.expiration_date}
                        onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                        className={`pl-10 ${errors.expiration_date ? 'border-red-500' : ''}`}
                      />
                    </>
                  )}
                </div>

                {useManualDateEntry && (
                  <p className="mt-1 text-xs text-gray-500">
                    Enter date in DD/MM/YYYY format (e.g., 25/12/24 or 25/12/2024)
                  </p>
                )}

                {errors.expiration_date && (
                  <p className="mt-1 flex items-center text-sm text-red-500">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {errors.expiration_date}
                  </p>
                )}
              </div>
            )}

            {/* Cost per Unit (optional) */}
            <div>
              <Label htmlFor="cost_per_unit">{t('addInventory.costPerUnit')}</Label>
              <div className="relative">
                <DollarSign className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="cost_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={(e) => handleInputChange('cost_per_unit', e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${errors.cost_per_unit ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.cost_per_unit && (
                <p className="mt-1 flex items-center text-sm text-red-500">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {errors.cost_per_unit}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="flex items-center text-sm text-red-700">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t('addInventory.adding')}</span>
                  </div>
                ) : (
                  t('addInventory.addToInventory')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
