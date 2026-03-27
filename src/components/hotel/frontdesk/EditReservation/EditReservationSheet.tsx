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
import { useReplaceCharges } from '@/lib/queries/hooks/useReservationCharges';
import { unifiedPricingService } from '@/lib/hotel/services/UnifiedPricingService';
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
  const replaceCharges = useReplaceCharges();

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
    if (!reservationId || !reservation) return;
    try {
      // Save reservation fields
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

      // Regenerate charges if pricing-relevant fields changed
      const pricingChanged =
        values.check_in_date !== reservation.check_in_date ||
        values.check_out_date !== reservation.check_out_date ||
        values.room_id !== reservation.room_id ||
        values.adults !== reservation.adults ||
        values.children_count !== (reservation.children_count ?? 0) ||
        values.has_pets !== (reservation.has_pets ?? false) ||
        values.parking_required !== (reservation.parking_required ?? false);

      if (pricingChanged) {
        try {
          const guestEntries = [
            ...Array(values.adults)
              .fill(null)
              .map(() => ({ name: 'Guest', type: 'adult' as const })),
            ...Array(values.children_count)
              .fill(null)
              .map((_, i) => ({ name: `Child ${i + 1}`, type: 'child' as const })),
          ];
          const newCharges = await unifiedPricingService.generateCharges({
            roomId: String(values.room_id),
            checkIn: new Date(values.check_in_date),
            checkOut: new Date(values.check_out_date),
            guests: guestEntries,
            hasPets: values.has_pets,
            parkingRequired: values.parking_required,
          });
          await replaceCharges.mutateAsync({
            reservationId,
            charges: newCharges.map((c) => ({
              charge_type: c.chargeType,
              description: c.description,
              quantity: c.quantity,
              unit_price: c.unitPrice,
              total: c.total,
              vat_rate: c.vatRate ?? 0.13,
              sort_order: c.sortOrder ?? 0,
            })),
          });
        } catch (chargeErr) {
          console.error('Failed to regenerate charges:', chargeErr);
          hotelNotification.info(
            t('editRes.chargesWarning', 'Charges Not Updated'),
            t(
              'editRes.chargesWarningDesc',
              'Reservation saved but charges may need manual recalculation.'
            )
          );
        }
      }

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
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]">
        {isLoading || !reservation ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="border-b bg-gradient-to-b from-white to-gray-50/80 px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-lg">
                  {t('editRes.title', 'Edit Reservation')} #{reservation.id}
                </SheetTitle>
                <Badge
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    STATUS_COLORS[statusCode]
                  )}
                >
                  {statusCode}
                </Badge>
              </div>
              <SheetDescription className="text-sm">
                {reservation.guests?.full_name ??
                  `${reservation.guests?.first_name ?? ''} ${reservation.guests?.last_name ?? ''}`.trim()}
              </SheetDescription>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b px-6">
                <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-3 pt-2 pb-2.5 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('editRes.tabDetails', 'Details')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="guest"
                    className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-3 pt-2 pb-2.5 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('editRes.tabGuest', 'Guest')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-3 pt-2 pb-2.5 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('editRes.tabNotes', 'Notes')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="charges"
                    className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-3 pt-2 pb-2.5 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('editRes.tabCharges', 'Charges')}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
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

            {/* Footer */}
            <SheetFooter className="mt-auto gap-3 border-t bg-gray-50/50 px-6 py-4">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit(onSubmit)}
                disabled={!isDirty || isSubmitting}
              >
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
