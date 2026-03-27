import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateGuest } from '@/lib/queries/hooks/useGuests';
import hotelNotification from '@/lib/notifications';
import type { Reservation } from '@/lib/queries/hooks/useReservations';

const COUNTRIES = [
  'HR',
  'DE',
  'AT',
  'SI',
  'IT',
  'HU',
  'CZ',
  'SK',
  'PL',
  'FR',
  'GB',
  'NL',
  'BE',
  'CH',
  'US',
  'CA',
  'AU',
  'SE',
  'NO',
  'DK',
  'FI',
  'ES',
  'PT',
  'RO',
  'BG',
  'RS',
  'BA',
  'ME',
  'MK',
  'AL',
] as const;

const LANGUAGES = ['hr', 'de', 'en'] as const;

const guestFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  date_of_birth: z.string().optional(),
  preferred_language: z.string().optional(),
  is_vip: z.boolean(),
  vip_level: z.number().min(0).max(5),
});

type GuestFormValues = z.infer<typeof guestFormSchema>;

interface GuestInfoTabProps {
  reservation: Reservation;
  onGuestUpdated?: () => void;
}

export function GuestInfoTab({ reservation, onGuestUpdated }: GuestInfoTabProps) {
  const { t } = useTranslation();
  const updateGuest = useUpdateGuest();
  const guest = reservation.guests;

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      first_name: guest?.first_name ?? '',
      last_name: guest?.last_name ?? '',
      email: guest?.email ?? '',
      phone: guest?.phone ?? '',
      nationality: guest?.nationality ?? '',
      date_of_birth: '',
      preferred_language: '',
      is_vip: guest?.is_vip ?? false,
      vip_level: guest?.vip_level ?? 0,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const isVip = watch('is_vip');

  const onSubmit = async (values: GuestFormValues) => {
    if (!guest?.id) return;
    try {
      await updateGuest.mutateAsync({
        id: guest.id,
        updates: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          nationality: values.nationality || null,
          is_vip: values.is_vip,
          vip_level: values.vip_level,
        },
      });
      hotelNotification.success(
        t('editRes.guestUpdated', 'Guest Updated'),
        t('editRes.guestUpdatedDesc', 'Guest information has been saved.')
      );
      onGuestUpdated?.();
    } catch {
      hotelNotification.error(
        t('editRes.guestError', 'Update Failed'),
        t('editRes.guestErrorDesc', 'Could not update guest information.')
      );
    }
  };

  if (!guest) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t('editRes.noGuest', 'No guest linked to this reservation.')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">{t('editRes.firstName', 'First Name')}</Label>
          <Input id="first_name" {...register('first_name')} />
          {errors.first_name && <p className="text-sm text-red-500">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">{t('editRes.lastName', 'Last Name')}</Label>
          <Input id="last_name" {...register('last_name')} />
          {errors.last_name && <p className="text-sm text-red-500">{errors.last_name.message}</p>}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('editRes.email', 'Email')}</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('editRes.phone', 'Phone')}</Label>
          <Input id="phone" type="tel" {...register('phone')} />
        </div>
      </div>

      {/* Nationality + Language */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('editRes.nationality', 'Nationality')}</Label>
          <Select
            value={watch('nationality') ?? ''}
            onValueChange={(val) => setValue('nationality', val, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('editRes.selectCountry', 'Select country')} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('editRes.language', 'Preferred Language')}</Label>
          <Select
            value={watch('preferred_language') ?? ''}
            onValueChange={(val) => setValue('preferred_language', val, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('editRes.selectLang', 'Select language')} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date of birth */}
      <div className="space-y-1.5">
        <Label htmlFor="date_of_birth">{t('editRes.dob', 'Date of Birth')}</Label>
        <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
      </div>

      {/* VIP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm font-medium">{t('editRes.vip', 'VIP Guest')}</span>
          <Switch
            checked={isVip}
            onCheckedChange={(val) => setValue('is_vip', val, { shouldDirty: true })}
          />
        </div>
        {isVip && (
          <div className="space-y-1.5">
            <Label htmlFor="vip_level">{t('editRes.vipLevel', 'VIP Level')}</Label>
            <Input
              id="vip_level"
              type="number"
              min={0}
              max={5}
              {...register('vip_level', { valueAsNumber: true })}
            />
          </div>
        )}
      </div>

      {/* Save */}
      <Button type="submit" disabled={!isDirty || isSubmitting} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {t('editRes.saveGuest', 'Save Guest Info')}
      </Button>
    </form>
  );
}
