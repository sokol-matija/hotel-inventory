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
    <div className="space-y-6">
      {/* Dates */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {t('editRes.dates', 'Stay Dates')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="check_in_date" className="text-xs text-gray-500">
              {t('editRes.checkIn', 'Check-in')}
            </Label>
            <Input
              id="check_in_date"
              type="date"
              className="rounded-lg"
              {...register('check_in_date')}
            />
            {errors.check_in_date && (
              <p className="text-xs text-red-500">{errors.check_in_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="check_out_date" className="text-xs text-gray-500">
                {t('editRes.checkOut', 'Check-out')}
              </Label>
              {nights > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0 text-[10px] font-medium"
                >
                  {nights} {t('editRes.nights', 'nights')}
                </Badge>
              )}
            </div>
            <Input
              id="check_out_date"
              type="date"
              className="rounded-lg"
              {...register('check_out_date')}
            />
            {errors.check_out_date && (
              <p className="text-xs text-red-500">{errors.check_out_date.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Room + Status */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {t('editRes.roomAndStatus', 'Room & Status')}
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">{t('editRes.room', 'Room')}</Label>
            <Select
              value={String(watch('room_id'))}
              onValueChange={(val) => setValue('room_id', Number(val), { shouldDirty: true })}
            >
              <SelectTrigger className="rounded-lg">
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
            {errors.room_id && <p className="text-xs text-red-500">{errors.room_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">{t('editRes.status', 'Status')}</Label>
              <Select
                value={watch('status')}
                onValueChange={(val) => setValue('status', val, { shouldDirty: true })}
              >
                <SelectTrigger className="rounded-lg capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">
                {t('editRes.source', 'Booking Source')}
              </Label>
              <Select
                value={watch('booking_source') ?? ''}
                onValueChange={(val) => setValue('booking_source', val, { shouldDirty: true })}
              >
                <SelectTrigger className="rounded-lg capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Count */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {t('editRes.guestCount', 'Guests')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="adults" className="text-xs text-gray-500">
              {t('editRes.adults', 'Adults')}
            </Label>
            <Input
              id="adults"
              type="number"
              min={1}
              className="rounded-lg"
              {...register('adults', { valueAsNumber: true })}
            />
            {errors.adults && <p className="text-xs text-red-500">{errors.adults.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="children_count" className="text-xs text-gray-500">
              {t('editRes.children', 'Children')}
            </Label>
            <Input
              id="children_count"
              type="number"
              min={0}
              className="rounded-lg"
              {...register('children_count', { valueAsNumber: true })}
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {t('editRes.services', 'Services')}
        </h3>
        <div className="divide-y">
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm">{t('editRes.parking', 'Parking required')}</span>
            <Switch
              checked={watch('parking_required')}
              onCheckedChange={(val) => setValue('parking_required', val, { shouldDirty: true })}
            />
          </div>
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm">{t('editRes.pets', 'Has pets')}</span>
            <Switch
              checked={watch('has_pets')}
              onCheckedChange={(val) => setValue('has_pets', val, { shouldDirty: true })}
            />
          </div>
        </div>
      </section>

      {/* Company billing */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {t('editRes.billing', 'Company Billing')}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
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
              <SelectTrigger className="rounded-lg">
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
      </section>

      {/* Label */}
      {labelName && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {t('editRes.label', 'Label')}
          </h3>
          <Badge variant="outline" className="rounded-full">
            {labelName}
          </Badge>
        </section>
      )}
    </div>
  );
}
