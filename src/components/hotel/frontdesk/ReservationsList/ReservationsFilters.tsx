// ReservationsFilters - Advanced filter panel with multiple filter types
// Provides comprehensive filtering options for power users

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X, Calendar, ChevronDown } from 'lucide-react';
import { ReservationsFilters as FiltersType } from '../../../../hooks/useReservationsList';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Label } from '../../../ui/label';

interface ReservationsFiltersProps {
  filters: FiltersType;
  onUpdateFilters: (updates: Partial<FiltersType>) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ReservationsFilters({
  filters,
  onUpdateFilters,
  onClearFilters,
  isOpen,
  onToggle
}: ReservationsFiltersProps) {
  const { t } = useTranslation();

  // Status options
  const statusOptions = [
    'confirmed',
    'checked-in',
    'checked-out',
    'cancelled',
    'no-show',
    'room-closure',
    'unallocated',
    'incomplete-payment'
  ];

  // Booking source options
  const bookingSourceOptions = [
    'booking.com',
    'airbnb',
    'direct',
    'phone',
    'email',
    'walk-in',
    'other'
  ];

  // Payment status options
  const paymentStatusOptions = [
    'paid',
    'partial',
    'pending',
    'refunded',
    'cancelled'
  ];

  // Room type options (from your database)
  const roomTypeOptions = [
    'big-double',
    'big-single',
    'double',
    'triple',
    'single',
    'family',
    'apartment',
    'rooftop-apartment'
  ];

  // Common nationalities (can be expanded)
  const nationalityOptions = [
    'Croatian',
    'German',
    'Italian',
    'Austrian',
    'Slovenian',
    'Czech',
    'Polish',
    'Hungarian',
    'British',
    'French',
    'Other'
  ];

  // Toggle multi-select option
  const toggleArrayOption = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(v => v !== value);
    }
    return [...array, value];
  };

  // Count active filters
  const activeFilterCount = [
    filters.statuses.length,
    filters.bookingSources.length,
    filters.paymentStatuses.length,
    filters.roomTypes.length,
    filters.nationalities.length,
    filters.vipOnly ? 1 : 0,
    filters.hasSpecialRequests ? 1 : 0,
    filters.checkInFrom ? 1 : 0,
    filters.checkInTo ? 1 : 0,
    filters.checkOutFrom ? 1 : 0,
    filters.checkOutTo ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className="relative"
      >
        <Filter className="w-4 h-4 mr-2" />
        {t('reservationsList.filters')}
        {activeFilterCount > 0 && (
          <Badge variant="default" className="ml-2 bg-blue-600">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('reservationsList.filters.apply')}
            {activeFilterCount > 0 && (
              <Badge variant="default" className="bg-blue-600">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearFilters}
              >
                {t('reservationsList.filters.clearAll')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Filter */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            {t('reservationsList.filters.status')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Badge
                key={status}
                variant={filters.statuses.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  onUpdateFilters({
                    statuses: toggleArrayOption(filters.statuses, status)
                  })
                }
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Booking Source Filter */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            {t('reservationsList.filters.bookingSource')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {bookingSourceOptions.map((source) => (
              <Badge
                key={source}
                variant={filters.bookingSources.includes(source) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  onUpdateFilters({
                    bookingSources: toggleArrayOption(filters.bookingSources, source)
                  })
                }
              >
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {/* Payment Status Filter */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            {t('reservationsList.filters.paymentStatus')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {paymentStatusOptions.map((status) => (
              <Badge
                key={status}
                variant={filters.paymentStatuses.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  onUpdateFilters({
                    paymentStatuses: toggleArrayOption(filters.paymentStatuses, status)
                  })
                }
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Room Type Filter */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            {t('reservationsList.filters.roomType')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {roomTypeOptions.map((type) => (
              <Badge
                key={type}
                variant={filters.roomTypes.includes(type) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  onUpdateFilters({
                    roomTypes: toggleArrayOption(filters.roomTypes, type)
                  })
                }
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Nationality Filter */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            {t('reservationsList.filters.nationality')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {nationalityOptions.map((nationality) => (
              <Badge
                key={nationality}
                variant={filters.nationalities.includes(nationality) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  onUpdateFilters({
                    nationalities: toggleArrayOption(filters.nationalities, nationality)
                  })
                }
              >
                {nationality}
              </Badge>
            ))}
          </div>
        </div>

        {/* Special Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="vipOnly"
              checked={filters.vipOnly}
              onChange={(e) => onUpdateFilters({ vipOnly: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="vipOnly" className="cursor-pointer">
              {t('reservationsList.filters.vipOnly')}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasSpecialRequests"
              checked={filters.hasSpecialRequests}
              onChange={(e) => onUpdateFilters({ hasSpecialRequests: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="hasSpecialRequests" className="cursor-pointer">
              {t('reservationsList.filters.specialRequests')}
            </Label>
          </div>
        </div>

        {/* Date Range Filters - Simplified for now */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            {t('reservationsList.filters.dateRange')}
          </p>
          <p className="text-xs text-gray-500">
            Date range filters will be enhanced in Phase 4
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
