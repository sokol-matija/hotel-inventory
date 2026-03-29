import { useState, useEffect } from 'react';
import { CheckCircle, ShoppingBag, Star, Key, CreditCard, MessageSquare, Car } from 'lucide-react';
import React from 'react';
import { Reservation, ReservationStatus, Guest } from '@/lib/hotel/types';
import { useRooms, Room } from '@/lib/queries/hooks/useRooms';
import { useGuests } from '@/lib/queries/hooks/useGuests';
import {
  useUpdateReservation,
  useUpdateReservationStatus,
} from '@/lib/queries/hooks/useReservations';
import { useReservationCharges } from '@/lib/queries/hooks/useReservationCharges';
import hotelNotification from '@/lib/notifications';
import { ntfyStaffNotify } from '@/lib/ntfy';
import { createInvoice as createInvoiceService } from '@/lib/hotel/services/InvoiceService';

export interface CheckOutStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export interface UseCheckOutWorkflowResult {
  // Data
  guest: Guest | null;
  room: Room | undefined;
  checkOutSteps: CheckOutStep[];
  isProcessing: boolean;
  isUpdating: boolean;
  checkOutNotes: string;
  roomKeyReturned: boolean;
  additionalCharges: number;
  guestSatisfaction: number;
  generateInvoice: boolean;
  paymentStatus: string;
  chargesTotalAmount: number;
  // Derived
  isEarlyCheckOut: boolean;
  isLateCheckOut: boolean;
  progressPercentage: number;
  totalAmount: number;
  canCompleteCheckOut: boolean;
  // Handlers
  handleStepToggle: (stepId: string) => void;
  handleMarkAsPaid: () => Promise<void>;
  handleSendInvoiceEmail: () => void;
  handleCompleteCheckOut: () => Promise<void>;
  setCheckOutNotes: (notes: string) => void;
  setAdditionalCharges: (amount: number) => void;
  setGuestSatisfaction: (rating: number) => void;
  setGenerateInvoice: (value: boolean) => void;
}

export function useCheckOutWorkflow(
  reservation: Reservation | null,
  onClose: () => void
): UseCheckOutWorkflowResult {
  const { data: rooms = [] } = useRooms();
  const { data: guests = [] } = useGuests();

  const addPayment = async (_payment: unknown) => {
    // Payment management not yet implemented — payments table integration pending
    console.warn('addPayment: not yet connected to DB');
  };

  const updateReservationMutation = useUpdateReservation();
  const updateReservationStatusMutation = useUpdateReservationStatus();
  const isUpdating =
    updateReservationMutation.isPending || updateReservationStatusMutation.isPending;

  const updateReservationStatus = async (id: number, status: string) => {
    await updateReservationStatusMutation.mutateAsync({
      id,
      status: status as ReservationStatus,
    });
  };

  const [checkOutSteps, setCheckOutSteps] = useState<CheckOutStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [roomKeyReturned, setRoomKeyReturned] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [guestSatisfaction, setGuestSatisfaction] = useState<number>(5);
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>(
    reservation?.reservation_statuses?.code ?? 'incomplete-payment'
  );

  const numericReservationId = reservation ? reservation.id : undefined;
  const { data: charges = [] } = useReservationCharges(numericReservationId as number | undefined);
  const chargesTotalAmount = charges.reduce((sum, c) => sum + c.total, 0);

  const guest = reservation ? (guests?.find((g) => g.id === reservation.guest_id) ?? null) : null;
  const room = reservation ? rooms.find((r) => r.id === reservation.room_id) : undefined;

  // Initialize check-out steps
  useEffect(() => {
    if (!reservation || !guest) return;

    const steps: CheckOutStep[] = [
      {
        id: 'room-inspection',
        title: 'Room Inspection',
        description: 'Check room condition and note any damages',
        completed: false,
        required: true,
        icon: CheckCircle,
      },
      {
        id: 'minibar',
        title: 'Minibar Check',
        description: 'Verify minibar consumption and add charges',
        completed: false,
        required: true,
        icon: ShoppingBag,
      },
      {
        id: 'additional-services',
        title: 'Additional Services',
        description: 'Review any additional services used (spa, restaurant, etc.)',
        completed: false,
        required: true,
        icon: Star,
      },
      {
        id: 'key-return',
        title: 'Room Key Return',
        description: `Collect room key/keycard for Room ${room?.room_number}`,
        completed: roomKeyReturned,
        required: true,
        icon: Key,
      },
      {
        id: 'final-payment',
        title: 'Final Payment',
        description: 'Process any outstanding balance or additional charges',
        completed: additionalCharges === 0,
        required: true,
        icon: CreditCard,
      },
      {
        id: 'satisfaction-survey',
        title: 'Guest Satisfaction',
        description: 'Collect feedback about the stay',
        completed: false,
        required: false,
        icon: MessageSquare,
      },
      {
        id: 'parking',
        title: 'Parking Settlement',
        description: 'Handle parking fees if applicable',
        completed: false,
        required: false,
        icon: Car,
      },
    ];

    setCheckOutSteps(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation, guest, roomKeyReturned, additionalCharges]);

  const handleStepToggle = (stepId: string) => {
    setCheckOutSteps((prev) => {
      const updated = prev.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      );
      if (stepId === 'key-return') {
        const keyStep = updated.find((s) => s.id === 'key-return');
        setRoomKeyReturned(keyStep?.completed ?? false);
      }
      return updated;
    });
  };

  const handleMarkAsPaid = async () => {
    if (!reservation) return;

    try {
      setIsProcessing(true);

      await updateReservationStatus(reservation.id, 'checked-out');
      setPaymentStatus('paid');

      try {
        const invoice = await createInvoiceService(reservation.id, {
          guestId: guest?.id,
        });

        await addPayment({
          invoiceId: invoice.id,
          amount: chargesTotalAmount + additionalCharges,
          currency: 'EUR',
          method: 'card',
          status: 'paid',
          receivedDate: new Date(),
          processedDate: new Date(),
          processedBy: 'Front Desk Staff',
          notes: `Payment processed during stay - ${guest?.display_name}`,
          referenceNumber: `PAYMENT-${Date.now()}`,
        });

        hotelNotification.success(
          'Payment Processed & Invoice Created',
          `Payment marked as paid for ${guest?.display_name}. Invoice ${invoice.invoiceNumber} created and available in Finance module.`,
          5000
        );

        void ntfyStaffNotify(
          `Check-Out - Room ${room?.room_number ?? '?'}`,
          `${guest?.display_name ?? 'Guest'} checked out · Invoice ${invoice.invoiceNumber}`,
          'default',
          'hotel,checkout,payment'
        );
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        hotelNotification.warning(
          'Payment Marked but Invoice Failed',
          `Payment marked as paid for ${guest?.display_name}, but invoice generation failed. Please create manually from Finance module.`,
          4000
        );
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
      hotelNotification.error(
        'Failed to Update Payment',
        'Unable to mark payment as paid. Please try again.',
        3000
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendInvoiceEmail = () => {
    hotelNotification.info(
      'Email Feature Coming Soon',
      'PDF invoice email functionality will be available in a future update.',
      4000
    );
  };

  const canCompleteCheckOut = checkOutSteps
    .filter((step) => step.required)
    .every((step) => step.completed);

  const handleCompleteCheckOut = async () => {
    if (!reservation || !canCompleteCheckOut) return;

    try {
      setIsProcessing(true);

      await updateReservationStatus(reservation.id, 'checked-out');

      if (generateInvoice) {
        try {
          const invoice = await createInvoiceService(reservation.id, {
            guestId: guest?.id,
          });

          hotelNotification.success(
            'Invoice Generated',
            `Invoice ${invoice.invoiceNumber} created for ${guest?.display_name}. Payment can be processed using "Mark as Paid" button after POS transaction.`,
            6000
          );
        } catch (error) {
          console.error('Failed to generate invoice:', error);
          hotelNotification.error(
            'Invoice Generation Failed',
            'Failed to generate invoice. Please try again or handle manually from the Finance module.',
            5000
          );
        }
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to complete check-out:', error);
      alert('Failed to complete check-out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkOutDate = reservation ? new Date(reservation.check_out_date) : new Date();
  const isEarlyCheckOut = reservation ? new Date() < checkOutDate : false;
  const isLateCheckOut = reservation
    ? new Date() > new Date(checkOutDate.getTime() + 2 * 60 * 60 * 1000)
    : false;

  const progressPercentage =
    checkOutSteps.length > 0
      ? (checkOutSteps.filter((step) => step.completed).length / checkOutSteps.length) * 100
      : 0;

  const totalAmount = reservation ? chargesTotalAmount + additionalCharges : 0;

  return {
    guest,
    room,
    checkOutSteps,
    isProcessing,
    isUpdating,
    checkOutNotes,
    roomKeyReturned,
    additionalCharges,
    guestSatisfaction,
    generateInvoice,
    paymentStatus,
    chargesTotalAmount,
    isEarlyCheckOut,
    isLateCheckOut,
    progressPercentage,
    totalAmount,
    canCompleteCheckOut,
    handleStepToggle,
    handleMarkAsPaid,
    handleSendInvoiceEmail,
    handleCompleteCheckOut,
    setCheckOutNotes,
    setAdditionalCharges,
    setGuestSatisfaction,
    setGenerateInvoice,
  };
}
