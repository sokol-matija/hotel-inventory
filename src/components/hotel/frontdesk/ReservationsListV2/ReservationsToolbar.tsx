import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TFunction } from 'i18next';

const STATUSES = [
  'confirmed',
  'checked-in',
  'checked-out',
  'cancelled',
  'no-show',
  'pending',
  'unallocated',
] as const;

const SOURCES = ['booking.com', 'airbnb', 'direct', 'phone', 'email', 'walk-in', 'other'] as const;

interface ReservationsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  t: TFunction;
}

export function ReservationsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  onClearFilters,
  hasActiveFilters,
  t,
}: ReservationsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative max-w-sm min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t(
            'reservationsList.filters.searchPlaceholder',
            'Search by reference or confirmation...'
          )}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('reservationsList.filters.allStatuses', 'All Statuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t('reservationsList.filters.allStatuses', 'All Statuses')}
          </SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('reservationsList.filters.allSources', 'All Sources')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t('reservationsList.filters.allSources', 'All Sources')}
          </SelectItem>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="mr-1 h-4 w-4" />
          {t('reservationsList.filters.clear', 'Clear')}
        </Button>
      )}
    </div>
  );
}
