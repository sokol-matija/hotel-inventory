import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRooms } from '@/lib/queries/hooks/useRooms';
import { useCompanies } from '@/lib/queries/hooks/useCompanies';
import type { EditReservationFormValues } from '@/lib/hotel/schemas/reservation';
import type { Reservation } from '@/lib/queries/hooks/useReservations';
import { cn } from '@/lib/utils';

const STATUSES = [
  'confirmed',
  'checked-in',
  'checked-out',
  'cancelled',
  'no-show',
  'pending',
  'unallocated',
] as const;

const SOURCES = ['direct', 'booking.com', 'airbnb', 'phone', 'email', 'walk-in', 'other'] as const;

interface ReservationDetailsTabProps {
  form: UseFormReturn<EditReservationFormValues>;
  reservation: Reservation;
}

export function ReservationDetailsTab({ form, reservation }: ReservationDetailsTabProps) {
  const { t } = useTranslation();
  const { data: rooms = [] } = useRooms();
  const { data: companies = [] } = useCompanies();

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const checkIn = watch('check_in_date');
  const checkOut = watch('check_out_date');
  const isR1 = watch('is_r1');

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, differenceInDays(new Date(checkOut), new Date(checkIn)));
  }, [checkIn, checkOut]);

  const roomsByFloor = useMemo(() => {
    const grouped = new Map<number, typeof rooms>();
    for (const room of rooms) {
      const floor = room.floor_number ?? 0;
      if (!grouped.has(floor)) grouped.set(floor, []);
      grouped.get(floor)!.push(room);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [rooms]);

  const labelName = reservation.labels?.name ?? null;

  return (
    <div className="space-y-5">
      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="check_in_date">{t('editRes.checkIn', 'Check-in')}</Label>
          <Input id="check_in_date" type="date" {...register('check_in_date')} />
          {errors.check_in_date && (
            <p className="text-sm text-red-500">{errors.check_in_date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="check_out_date">{t('editRes.checkOut', 'Check-out')}</Label>
            {nights > 0 && (
              <Badge variant="secondary" className="text-xs">
                {nights} {t('editRes.nights', 'nights')}
              </Badge>
            )}
          </div>
          <Input id="check_out_date" type="date" {...register('check_out_date')} />
          {errors.check_out_date && (
            <p className="text-sm text-red-500">{errors.check_out_date.message}</p>
          )}
        </div>
      </div>

      {/* Room */}
      <div className="space-y-1.5">
        <Label>{t('editRes.room', 'Room')}</Label>
        <Select
          value={String(watch('room_id'))}
          onValueChange={(val) => setValue('room_id', Number(val), { shouldDirty: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('editRes.selectRoom', 'Select room')} />
          </SelectTrigger>
          <SelectContent>
            {roomsByFloor.map(([floor, floorRooms]) => (
              <SelectGroup key={floor}>
                <SelectLabel>
                  {t('editRes.floor', 'Floor')} {floor}
                </SelectLabel>
                {floorRooms.map((room) => (
                  <SelectItem key={room.id} value={String(room.id)}>
                    <span className={cn(room.id === reservation.room_id && 'font-semibold')}>
                      {room.room_number} {room.name_english}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {errors.room_id && <p className="text-sm text-red-500">{errors.room_id.message}</p>}
      </div>

      {/* Status + Source */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('editRes.status', 'Status')}</Label>
          <Select
            value={watch('status')}
            onValueChange={(val) => setValue('status', val, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('editRes.source', 'Booking Source')}</Label>
          <Select
            value={watch('booking_source') ?? ''}
            onValueChange={(val) => setValue('booking_source', val, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guest count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="adults">{t('editRes.adults', 'Adults')}</Label>
          <Input
            id="adults"
            type="number"
            min={1}
            {...register('adults', { valueAsNumber: true })}
          />
          {errors.adults && <p className="text-sm text-red-500">{errors.adults.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="children_count">{t('editRes.children', 'Children')}</Label>
          <Input
            id="children_count"
            type="number"
            min={0}
            {...register('children_count', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Services */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('editRes.services', 'Services')}</Label>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{t('editRes.parking', 'Parking required')}</span>
          <Switch
            checked={watch('parking_required')}
            onCheckedChange={(val) => setValue('parking_required', val, { shouldDirty: true })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{t('editRes.pets', 'Has pets')}</span>
          <Switch
            checked={watch('has_pets')}
            onCheckedChange={(val) => setValue('has_pets', val, { shouldDirty: true })}
          />
        </div>
      </div>

      {/* Company billing */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('editRes.billing', 'Company Billing')}</Label>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{t('editRes.r1Invoice', 'R1 Invoice')}</span>
          <Switch
            checked={isR1}
            onCheckedChange={(val) => {
              setValue('is_r1', val, { shouldDirty: true });
              if (!val) setValue('company_id', null, { shouldDirty: true });
            }}
          />
        </div>
        {isR1 && (
          <Select
            value={watch('company_id') != null ? String(watch('company_id')) : ''}
            onValueChange={(val) =>
              setValue('company_id', val ? Number(val) : null, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('editRes.selectCompany', 'Select company')} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} ({c.oib})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t('editRes.label', 'Label')}</Label>
        <p className="text-muted-foreground text-sm">
          {labelName ?? t('editRes.noLabel', 'No label')}
        </p>
      </div>
    </div>
  );
}
