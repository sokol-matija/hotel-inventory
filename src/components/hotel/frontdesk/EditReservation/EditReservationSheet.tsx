import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReservations, useUpdateReservation } from '@/lib/queries/hooks/useReservations';
import {
  editReservationSchema,
  type EditReservationFormValues,
} from '@/lib/hotel/schemas/reservation';
import hotelNotification from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { ReservationDetailsTab } from './ReservationDetailsTab';
import { GuestInfoTab } from './GuestInfoTab';
import { NotesTab } from './NotesTab';
import { ChargesTab } from './ChargesTab';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  'checked-in': 'bg-blue-100 text-blue-800',
  'checked-out': 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  'no-show': 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
  unallocated: 'bg-sky-100 text-sky-800',
};

interface EditReservationSheetProps {
  reservationId: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditReservationSheet({
  reservationId,
  onClose,
  onSaved,
}: EditReservationSheetProps) {
  const { t } = useTranslation();
  const { data: reservations = [], isLoading } = useReservations();
  const updateReservation = useUpdateReservation();

  const reservation = useMemo(
    () => reservations.find((r) => r.id === reservationId) ?? null,
    [reservations, reservationId]
  );

  const statusCode = reservation?.reservation_statuses?.code ?? 'pending';

  const form = useForm<EditReservationFormValues>({
    resolver: zodResolver(editReservationSchema),
    defaultValues: {
      check_in_date: '',
      check_out_date: '',
      room_id: 0,
      status: '',
      booking_source: '',
      adults: 1,
      children_count: 0,
      has_pets: false,
      parking_required: false,
      is_r1: false,
      company_id: null,
      label_id: null,
      special_requests: '',
      internal_notes: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = form;

  // Reset form when reservation changes
  useEffect(() => {
    if (!reservation) return;
    reset({
      check_in_date: reservation.check_in_date ?? '',
      check_out_date: reservation.check_out_date ?? '',
      room_id: reservation.room_id ?? 0,
      status: reservation.reservation_statuses?.code ?? 'pending',
      booking_source: reservation.booking_sources?.code ?? '',
      adults: reservation.adults ?? 1,
      children_count: reservation.children_count ?? 0,
      has_pets: reservation.has_pets ?? false,
      parking_required: reservation.parking_required ?? false,
      is_r1: reservation.is_r1 ?? false,
      company_id: reservation.company_id ?? null,
      label_id: reservation.label_id ?? null,
      special_requests: reservation.special_requests ?? '',
      internal_notes: reservation.internal_notes ?? '',
    });
  }, [reservation, reset]);

  const onSubmit = async (values: EditReservationFormValues) => {
    if (!reservationId) return;
    try {
      await updateReservation.mutateAsync({
        id: reservationId,
        updates: {
          check_in_date: values.check_in_date,
          check_out_date: values.check_out_date,
          room_id: values.room_id,
          status: values.status,
          adults: values.adults,
          children_count: values.children_count,
          number_of_guests: values.adults + values.children_count,
          has_pets: values.has_pets,
          parking_required: values.parking_required,
          is_r1: values.is_r1,
          company_id: values.company_id,
          label_id: values.label_id,
          special_requests: values.special_requests ?? '',
          internal_notes: values.internal_notes ?? '',
        },
      });
      hotelNotification.success(
        t('editRes.saved', 'Reservation Updated'),
        t('editRes.savedDesc', 'Changes have been saved successfully.')
      );
      onSaved?.();
      onClose();
    } catch {
      hotelNotification.error(
        t('editRes.saveError', 'Update Failed'),
        t('editRes.saveErrorDesc', 'Could not save reservation changes.')
      );
    }
  };

  const isOpen = reservationId !== null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-[600px]">
        {isLoading || !reservation ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <SheetTitle>
                  {t('editRes.title', 'Edit Reservation')} #{reservation.id}
                </SheetTitle>
                <Badge className={cn('text-xs', STATUS_COLORS[statusCode])}>{statusCode}</Badge>
              </div>
              <SheetDescription>
                {reservation.guests?.full_name ??
                  `${reservation.guests?.first_name ?? ''} ${reservation.guests?.last_name ?? ''}`.trim()}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-4 flex flex-1 flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">{t('editRes.tabDetails', 'Details')}</TabsTrigger>
                <TabsTrigger value="guest">{t('editRes.tabGuest', 'Guest')}</TabsTrigger>
                <TabsTrigger value="notes">{t('editRes.tabNotes', 'Notes')}</TabsTrigger>
                <TabsTrigger value="charges">{t('editRes.tabCharges', 'Charges')}</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto py-4">
                <TabsContent value="details" className="mt-0">
                  <ReservationDetailsTab form={form} reservation={reservation} />
                </TabsContent>
                <TabsContent value="guest" className="mt-0">
                  <GuestInfoTab reservation={reservation} />
                </TabsContent>
                <TabsContent value="notes" className="mt-0">
                  <NotesTab form={form} />
                </TabsContent>
                <TabsContent value="charges" className="mt-0">
                  <ChargesTab reservationId={reservation.id} />
                </TabsContent>
              </div>
            </Tabs>

            <SheetFooter className="mt-auto border-t pt-4">
              <Button variant="outline" onClick={onClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={!isDirty || isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t('common.save', 'Save')}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
