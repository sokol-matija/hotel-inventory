import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  X,
  Calendar as CalendarIcon,
  UserPlus,
  Baby,
  Car,
  Users,
  User,
  Trash2,
  Receipt,
  Home,
  Building2,
  Tag,
  Loader2,
} from 'lucide-react';
import { Room, Guest, GuestChild, ReservationCharge, ChargeType } from '../../../lib/hotel/types';
import hotelNotification from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';
import { useRooms } from '../../../lib/queries/hooks/useRooms';
import { useCompanies } from '../../../lib/queries/hooks/useCompanies';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queries/queryKeys';
import LabelAutocomplete from '../shared/LabelAutocomplete';
import GuestAutocomplete from './Guests/GuestAutocomplete';
import { unifiedPricingService } from '../../../lib/hotel/services/UnifiedPricingService';
import { HOTEL_ID } from '../../../lib/hotel/constants';
import { ntfyService, BookingNotificationData } from '../../../lib/ntfyService';
import { virtualRoomService } from '../../../lib/hotel/services/VirtualRoomService';

interface ModernCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null; // Now optional - null for unallocated mode
  currentDate?: Date;
  preSelectedDates?: { checkIn: Date; checkOut: Date } | null;
  allowRoomSelection?: boolean; // Enable room dropdown
  unallocatedMode?: boolean; // Create unallocated reservation
}

export default function ModernCreateBookingModal({
  isOpen,
  onClose,
  room,
  currentDate,
  preSelectedDates,
  allowRoomSelection = false,
  unallocatedMode = false,
}: ModernCreateBookingModalProps) {
  const { data: rooms = [] } = useRooms();
  const { data: companies = [] } = useCompanies();
  const queryClient = useQueryClient();
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
  };

  // Hotel Porec UUID — matches the hotels table PK
  const hotelId = HOTEL_ID;

  // Room selection state for unallocated mode
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(room);
  const [isUnallocated, setIsUnallocated] = useState(unallocatedMode);

  // Basic booking info
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut ||
      new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );

  // Enhanced guest management
  const [bookingGuests, setBookingGuests] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      email?: string;
      phone?: string;
      nationality?: string;
      dateOfBirth?: string;
      type: 'adult' | 'child';
      age?: number;
      isExisting: boolean;
      existingGuestId?: number;
      preferredLanguage: string;
      dietaryRestrictions: string[];
      hasPets: boolean;
      isVip: boolean;
      vipLevel: number;
      children: GuestChild[];
      totalStays: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >([]);

  // Initialize with one adult guest
  useEffect(() => {
    if (bookingGuests.length === 0) {
      setBookingGuests([createEmptyGuest('adult')]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple booking-level services
  const [bookingServices, setBookingServices] = useState({
    needsParking: false,
    parkingSpots: 0,
    hasPets: false,
    petCount: 0,
    specialRequests: '',
  });

  // Company billing (R1) state
  const [isCompanyBilling, setIsCompanyBilling] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Label/Group state
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // Charge preview (replaces flat pricing state)
  const [previewCharges, setPreviewCharges] = useState<ReservationCharge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to create empty guest
  const createEmptyGuest = (type: 'adult' | 'child') => ({
    id: `new-${Date.now()}-${Math.random()}`,
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    type,
    age: type === 'child' ? 12 : undefined,
    isExisting: false,
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    hasPets: false,
    isVip: false,
    vipLevel: 0,
    children: [],
    totalStays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Generate charge line items whenever pricing dependencies change
  useEffect(() => {
    if (isUnallocated || !selectedRoom) {
      setPreviewCharges([]);
      return;
    }

    // Need at least one guest with a name
    const hasGuest = bookingGuests.some((g) => g.firstName.trim() || g.lastName.trim());
    if (!hasGuest) {
      setPreviewCharges([]);
      return;
    }

    const guests = bookingGuests.map((g) => ({
      name: `${g.firstName} ${g.lastName}`.trim() || (g.type === 'child' ? 'Child' : 'Guest'),
      type: g.type as 'adult' | 'child',
      age: g.age,
    }));

    // Determine primary guest id for returning-customer discount
    const primaryGuest = bookingGuests[0];
    const guestId =
      primaryGuest?.isExisting && primaryGuest?.existingGuestId
        ? String(primaryGuest.existingGuestId)
        : undefined;

    // Find pricing tier from company if applicable
    const selectedCompany =
      isCompanyBilling && selectedCompanyId
        ? companies.find((c) => c.id === selectedCompanyId)
        : undefined;
    const pricingTierId = selectedCompany?.pricingTierId ?? undefined;

    let cancelled = false;
    setChargesLoading(true);

    unifiedPricingService
      .generateCharges({
        roomId: selectedRoom.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        hasPets: bookingServices.hasPets,
        parkingRequired: bookingServices.needsParking,
        pricingTierId,
        guestId,
      })
      .then((charges) => {
        if (cancelled) return;
        setPreviewCharges(charges);
      })
      .catch(() => {
        /* keep previous charges on error */
      })
      .finally(() => {
        if (!cancelled) setChargesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    checkInDate,
    checkOutDate,
    bookingGuests,
    bookingServices,
    selectedRoom,
    isUnallocated,
    isCompanyBilling,
    selectedCompanyId,
    companies,
  ]);

  // Guest management functions
  const addAdult = () => {
    const maxOccupancy = selectedRoom?.maxOccupancy || 99; // High number for unallocated
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('adult')]);
    }
  };

  const addChild = () => {
    const maxOccupancy = selectedRoom?.maxOccupancy || 99; // High number for unallocated
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('child')]);
    }
  };

  const removeGuest = (guestId: string) => {
    if (bookingGuests.length > 1) {
      setBookingGuests(bookingGuests.filter((g) => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: string, value: string | number | boolean) => {
    setBookingGuests(
      bookingGuests.map((g) => {
        if (g.id === guestId) {
          const updated = { ...g, [field]: value };

          // Update fullName when firstName or lastName changes
          if (field === 'firstName' || field === 'lastName') {
            updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
          }

          // Auto-set age when changing type
          if (field === 'type') {
            if (value === 'child' && !updated.age) {
              updated.age = 12;
            } else if (value === 'adult') {
              updated.age = undefined;
            }
          }

          return updated;
        }
        return g;
      })
    );
  };

  // Handle selecting existing guest
  const handleSelectExistingGuest = (guest: Guest, guestIndex: number) => {
    const updatedGuests = [...bookingGuests];
    updatedGuests[guestIndex] = {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      fullName: guest.fullName,
      email: guest.email || '',
      phone: guest.phone || '',
      nationality: guest.nationality || '',
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.toISOString().split('T')[0] : '',
      type: 'adult' as const,
      age: undefined,
      isExisting: true,
      existingGuestId: parseInt(guest.id),
      preferredLanguage: guest.preferredLanguage || 'en',
      dietaryRestrictions: guest.dietaryRestrictions || [],
      hasPets: guest.hasPets || false,
      isVip: guest.isVip || false,
      vipLevel: guest.vipLevel || 0,
      children: guest.children || [],
      totalStays: guest.totalStays || 0,
      createdAt: guest.createdAt || new Date(),
      updatedAt: guest.updatedAt || new Date(),
    };
    setBookingGuests(updatedGuests);
  };

  // Form validation
  const validateForm = (): string[] => {
    const errors: string[] = [];

    // Date validation
    if (checkOutDate <= checkInDate) {
      errors.push('Check-out date must be after check-in date');
    }

    // Guest validation
    if (bookingGuests.length === 0) {
      errors.push('At least one guest is required');
      return errors;
    }

    // Primary guest validation (first guest must be adult with name)
    const primaryGuest = bookingGuests[0];
    if (primaryGuest.type !== 'adult') {
      errors.push('Primary guest must be an adult');
    }
    if (!primaryGuest.firstName.trim()) {
      errors.push('Primary guest first name is required');
    }
    if (!primaryGuest.lastName.trim()) {
      errors.push('Primary guest last name is required');
    }

    // Email validation
    const usedEmails = new Set<string>();
    bookingGuests.forEach((guest, index) => {
      if (guest.email && guest.email.trim()) {
        const email = guest.email.toLowerCase();
        if (usedEmails.has(email)) {
          errors.push(`Guest ${index + 1} has duplicate email address`);
        } else {
          usedEmails.add(email);
        }

        if (!guest.email.includes('@')) {
          errors.push(`Guest ${index + 1} has invalid email format`);
        }
      }
    });

    // Child age validation
    bookingGuests.forEach((guest, index) => {
      if (guest.type === 'child') {
        if (!guest.age || guest.age < 0 || guest.age >= 18) {
          errors.push(`Child guest ${index + 1} must have age between 0-17`);
        }
      }
    });

    // Occupancy validation (skip for unallocated)
    if (selectedRoom && !isUnallocated && bookingGuests.length > selectedRoom.maxOccupancy) {
      errors.push(
        `Total guests (${bookingGuests.length}) exceeds room capacity (${selectedRoom.maxOccupancy})`
      );
    }

    // Room selection validation
    if (!isUnallocated && !selectedRoom) {
      errors.push('Please select a room');
    }

    // Service validation
    if (bookingServices.needsParking && bookingServices.parkingSpots <= 0) {
      errors.push('Please specify number of parking spots needed');
    }
    if (bookingServices.hasPets && bookingServices.petCount <= 0) {
      errors.push('Please specify number of pets');
    }

    // Company billing validation
    if (isCompanyBilling && !selectedCompanyId) {
      errors.push('Please select a company for R1 billing');
    }

    return errors;
  };

  // Create booking with normalized database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const errors = validateForm();
    if (errors.length > 0) {
      hotelNotification.error('Validation Failed', errors.join(', '));
      return;
    }

    // Handle unallocated reservation creation
    if (isUnallocated) {
      try {
        setIsSubmitting(true);

        const primaryGuest = bookingGuests[0];
        const temporaryName =
          `${primaryGuest.firstName} ${primaryGuest.lastName}`.trim() || 'Guest';

        const result = await virtualRoomService.createUnallocatedReservation({
          temporaryGuestName: temporaryName,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          numberOfPeople: bookingGuests.length,
          notes: bookingServices.specialRequests,
        });

        if (result.success) {
          hotelNotification.success(
            'Unallocated Reservation Created',
            `Reservation for ${temporaryName} has been created and placed in unallocated queue.`
          );
          await refreshData();
          onClose();
        } else {
          hotelNotification.error('Creation Failed', result.error || 'Unknown error');
        }
      } catch (error: unknown) {
        console.error('Unallocated reservation creation failed:', error);
        hotelNotification.error('Creation Failed', 'Unable to create unallocated reservation');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Regular room booking flow continues below
    try {
      setIsSubmitting(true);

      const primaryGuest = bookingGuests[0];
      let primaryGuestId: number;

      // Handle primary guest (create new or use existing)
      if (primaryGuest.isExisting && primaryGuest.existingGuestId) {
        primaryGuestId = primaryGuest.existingGuestId;
      } else {
        // Create new primary guest
        const { data: createdGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: primaryGuest.firstName,
            last_name: primaryGuest.lastName,
            email: primaryGuest.email?.trim() || `guest_${Date.now()}@placeholder.local`,
            phone: primaryGuest.phone || null,
            nationality: primaryGuest.nationality || null,
            date_of_birth: primaryGuest.dateOfBirth || null,
          })
          .select()
          .single();

        if (guestError) throw guestError;
        primaryGuestId = createdGuest.id;
      }

      // Look up status_id and booking_source_id (FK columns, not varchar)
      const { data: statusRow } = await supabase
        .from('reservation_statuses')
        .select('id')
        .eq('code', 'confirmed')
        .single();
      const { data: sourceRow } = await supabase
        .from('booking_sources')
        .select('id')
        .eq('code', 'direct')
        .single();

      const adultsCount = bookingGuests.filter((g) => g.type === 'adult').length;
      const childrenCount = bookingGuests.filter((g) => g.type === 'child').length;
      const reservationData = {
        guest_id: primaryGuestId,
        room_id: parseInt(selectedRoom!.id),
        check_in_date: checkInDate.toISOString().split('T')[0],
        check_out_date: checkOutDate.toISOString().split('T')[0],
        adults: adultsCount,
        children_count: childrenCount,
        number_of_guests: adultsCount + childrenCount,
        status_id: statusRow?.id,
        booking_source_id: sourceRow?.id,
        special_requests: bookingServices.specialRequests || null,
        has_pets: bookingServices.hasPets,
        parking_required: bookingServices.needsParking,
        is_r1: isCompanyBilling,
        company_id: isCompanyBilling && selectedCompanyId ? parseInt(selectedCompanyId) : null,
        label_id: selectedLabelId,
      };

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) {
        console.error('Reservation creation failed:', {
          error: reservationError,
          sentData: reservationData,
        });
        throw reservationError;
      }

      // Batch-insert charge line items into reservation_charges
      if (previewCharges.length > 0) {
        const { error: chargesError } = await supabase.from('reservation_charges').insert(
          previewCharges.map((c) => ({
            reservation_id: reservation.id,
            charge_type: c.chargeType,
            description: c.description,
            quantity: c.quantity,
            unit_price: c.unitPrice,
            total: c.total,
            vat_rate: c.vatRate,
            sort_order: c.sortOrder,
          }))
        );

        if (chargesError) {
          console.error('Failed to insert reservation charges:', chargesError);
          // Non-fatal: reservation exists, charges can be regenerated
        }
      }

      // Create guest relationships and additional guests
      for (let i = 0; i < bookingGuests.length; i++) {
        const guest = bookingGuests[i];
        let guestId: number;

        if (i === 0) {
          guestId = primaryGuestId;
        } else if (guest.isExisting && guest.existingGuestId) {
          guestId = guest.existingGuestId;
        } else {
          // Create additional guest
          const email = guest.email?.trim() || `guest_${Date.now()}_${i}@placeholder.local`;

          const { data: additionalGuest, error: addGuestError } = await supabase
            .from('guests')
            .insert({
              first_name: guest.firstName,
              last_name: guest.lastName,
              email: email,
              phone: guest.phone || null,
              nationality: guest.nationality || null,
              date_of_birth: guest.dateOfBirth || null,
            })
            .select()
            .single();

          if (addGuestError) throw addGuestError;
          guestId = additionalGuest.id;
        }

        // Create reservation-guest relationship
        await supabase.from('reservation_guests').insert({
          reservation_id: reservation.id,
          guest_id: guestId,
        });

        // Create guest stay
        await supabase.from('guest_stays').insert({
          reservation_id: reservation.id,
          guest_id: guestId,
          check_in: checkInDate.toISOString(),
          check_out: checkOutDate.toISOString(),
        });

        // Create guest children record if child
        if (guest.type === 'child' && guest.age !== undefined) {
          // Calculate date of birth from age if not provided
          let dateOfBirth: string;
          if (guest.dateOfBirth) {
            dateOfBirth = new Date(guest.dateOfBirth).toISOString().split('T')[0];
          } else {
            // Calculate approximate DOB from age
            const today = new Date();
            const dob = new Date(
              today.getFullYear() - guest.age,
              today.getMonth(),
              today.getDate()
            );
            dateOfBirth = dob.toISOString().split('T')[0];
          }

          await supabase.from('guest_children').insert({
            reservation_id: reservation.id,
            guest_id: guestId,
            name: `${guest.firstName} ${guest.lastName}`,
            age: guest.age,
            date_of_birth: dateOfBirth,
          });
        }
      }

      const totalGuests = bookingGuests.length;
      const adults = bookingGuests.filter((g) => g.type === 'adult').length;
      const children = bookingGuests.filter((g) => g.type === 'child').length;

      hotelNotification.success(
        'Booking Created Successfully!',
        `Reservation for ${primaryGuest.firstName} ${primaryGuest.lastName} ` +
          `and ${totalGuests - 1} other guest${totalGuests > 2 ? 's' : ''} ` +
          `(${adults} adult${adults !== 1 ? 's' : ''}, ${children} child${children !== 1 ? 'ren' : ''}) ` +
          `in Room ${selectedRoom!.number} has been created.`
      );

      // Send ntfy.sh notification for Room 401 bookings
      if (selectedRoom!.number === '401') {
        try {
          const notificationData: BookingNotificationData = {
            roomNumber: selectedRoom!.number,
            guestName: `${primaryGuest.firstName} ${primaryGuest.lastName}`,
            checkIn: checkInDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            checkOut: checkOutDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            nights: numberOfNights,
            adults: adults,
            children: children,
            bookingSource: 'Front Desk - Modern Modal',
            totalAmount: chargeTotal,
          };

          const notificationSent =
            await ntfyService.sendRoom401BookingNotification(notificationData);

          if (!notificationSent) {
            console.error('Failed to send ntfy notification for room 401');
          }
        } catch (notificationError) {
          console.error('Error sending ntfy notification:', notificationError);
        }
      }

      // Refresh the hotel data to show the new booking in the UI
      refreshData();

      onClose();
    } catch (error: unknown) {
      console.error('Booking creation failed:', error);

      const dbError = error as { code?: string; message?: string };
      if (dbError?.code === '23505' && dbError?.message?.includes('guests_email_key')) {
        hotelNotification.error(
          'Email Already Exists',
          'This email address is already in use. Please use a different email.'
        );
      } else {
        hotelNotification.error('Booking Failed', 'Unable to create booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived pricing from previewCharges ──────────────────────────────────
  const chargeTotal = previewCharges.reduce((sum, c) => sum + c.total, 0);
  const numberOfNights = Math.max(
    1,
    Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Group charges by type for the summary table
  const chargesByType = previewCharges.reduce<Record<string, ReservationCharge[]>>((acc, c) => {
    const key = c.chargeType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // Section labels for charge types
  const chargeSectionLabels: Partial<Record<ChargeType, string>> = {
    accommodation: 'Accommodation',
    tourism_tax: 'Taxes',
    parking: 'Supplements',
    pet_fee: 'Supplements',
    short_stay_supplement: 'Supplements',
    towel_rental: 'Supplements',
    discount: 'Discounts',
    room_service: 'Room Service',
    additional: 'Additional',
  };

  // Ordered section keys for rendering
  const sectionOrder: ChargeType[] = [
    'accommodation',
    'tourism_tax',
    'parking',
    'pet_fee',
    'short_stay_supplement',
    'towel_rental',
    'discount',
    'room_service',
    'additional',
  ];

  // Build ordered sections (unique section labels)
  const renderedSections = new Set<string>();

  if (!isOpen) return null;

  const adultsCount = bookingGuests.filter((g) => g.type === 'adult').length;
  const childrenCount = bookingGuests.filter((g) => g.type === 'child').length;

  // Filter out virtual rooms from selection
  const availableRooms = rooms.filter((r) => r.floor !== 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card
        className="max-h-[95vh] w-full max-w-5xl overflow-y-auto"
        data-testid="create-booking-modal"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>
                {isUnallocated
                  ? 'Create Unallocated Reservation'
                  : selectedRoom
                    ? `Create Booking - Room ${selectedRoom.number}`
                    : 'Create Booking'}
              </span>
              {selectedRoom && <Badge variant="outline">{selectedRoom.type}</Badge>}
              {isUnallocated && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Unallocated
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            {adultsCount} adult{adultsCount !== 1 ? 's' : ''}, {childrenCount} child
            {childrenCount !== 1 ? 'ren' : ''}
            {selectedRoom && !isUnallocated && ` • Max occupancy: ${selectedRoom.maxOccupancy}`}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Selection & Unallocated Option */}
            {allowRoomSelection && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Home className="mr-2 h-4 w-4" />
                    Room Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Unallocated Checkbox */}
                  <div className="flex items-center space-x-3 rounded-md border bg-white p-3">
                    <input
                      type="checkbox"
                      id="unallocated"
                      checked={isUnallocated}
                      onChange={(e) => {
                        setIsUnallocated(e.target.checked);
                        if (e.target.checked) {
                          setSelectedRoom(null);
                        }
                      }}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="unallocated" className="cursor-pointer font-medium">
                        Create as Unallocated Reservation
                      </Label>
                      <p className="mt-1 text-xs text-gray-500">
                        Place in virtual queue - assign room later
                      </p>
                    </div>
                  </div>

                  {/* Room Selection Dropdown */}
                  {!isUnallocated && (
                    <div>
                      <Label>Select Room</Label>
                      <select
                        value={selectedRoom?.id || ''}
                        onChange={(e) => {
                          const room = availableRooms.find((r) => r.id === e.target.value);
                          setSelectedRoom(room || null);
                        }}
                        className="w-full rounded-md border p-2"
                        required={!isUnallocated}
                      >
                        <option value="">-- Select a room --</option>
                        {availableRooms
                          .sort((a, b) => a.number.localeCompare(b.number))
                          .map((room) => (
                            <option key={room.id} value={room.id}>
                              Room {room.number} - {room.type} (Floor {room.floor}, Max:{' '}
                              {room.maxOccupancy})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dates Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Booking Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in Date</Label>
                    <Input
                      type="date"
                      value={checkInDate.toISOString().split('T')[0]}
                      onChange={(e) => setCheckInDate(new Date(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Check-out Date</Label>
                    <Input
                      type="date"
                      value={checkOutDate.toISOString().split('T')[0]}
                      onChange={(e) => setCheckOutDate(new Date(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {numberOfNights} night{numberOfNights !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Guests Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Users className="mr-2 h-4 w-4" />
                    Guests ({bookingGuests.length}/{selectedRoom?.maxOccupancy || 10})
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdult}
                      disabled={bookingGuests.length >= (selectedRoom?.maxOccupancy || 10)}
                      className="flex items-center"
                    >
                      <UserPlus className="mr-1 h-4 w-4" />
                      Add Adult
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      disabled={bookingGuests.length >= (selectedRoom?.maxOccupancy || 10)}
                      className="flex items-center"
                    >
                      <Baby className="mr-1 h-4 w-4" />
                      Add Child
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingGuests.map((guest, index) => (
                    <div key={guest.id} className="rounded-lg border bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {guest.type === 'adult' ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Baby className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium">
                            {index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}
                            {guest.type === 'child' && guest.age && ` (Age ${guest.age})`}
                          </span>
                          <Badge variant={guest.type === 'adult' ? 'default' : 'secondary'}>
                            {guest.type === 'adult' ? 'Adult' : 'Child'}
                          </Badge>
                          {guest.isExisting && (
                            <Badge variant="outline" className="border-green-600 text-green-600">
                              Existing Guest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Guest Type Toggle */}
                          <select
                            value={guest.type}
                            onChange={(e) => updateGuest(guest.id, 'type', e.target.value)}
                            className="rounded border px-2 py-1 text-sm"
                            disabled={index === 0} // Primary guest must be adult
                          >
                            <option value="adult">Adult</option>
                            <option value="child">Child</option>
                          </select>

                          {index > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeGuest(guest.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Guest Selection for Existing Guests */}
                      {!guest.isExisting && guest.type === 'adult' && (
                        <div className="mb-3">
                          <Label className="text-sm">Or select existing guest</Label>
                          <GuestAutocomplete
                            onGuestSelect={(selectedGuest) =>
                              handleSelectExistingGuest(selectedGuest, index)
                            }
                            onCreateNew={() => {}} // Not needed here
                            selectedGuest={null}
                            placeholder="Search existing guests..."
                            className="mt-1"
                          />
                        </div>
                      )}

                      {/* Guest Details Form */}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <Label className="text-sm">First Name *</Label>
                          <Input
                            data-testid="guest-first-name"
                            placeholder="John"
                            value={guest.firstName}
                            onChange={(e) => updateGuest(guest.id, 'firstName', e.target.value)}
                            className="h-9"
                            disabled={guest.isExisting}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Last Name *</Label>
                          <Input
                            data-testid="guest-last-name"
                            placeholder="Doe"
                            value={guest.lastName}
                            onChange={(e) => updateGuest(guest.id, 'lastName', e.target.value)}
                            className="h-9"
                            disabled={guest.isExisting}
                          />
                        </div>

                        {guest.type === 'child' && (
                          <div>
                            <Label className="text-sm">Age *</Label>
                            <Input
                              type="number"
                              placeholder="12"
                              min="0"
                              max="17"
                              value={guest.age || ''}
                              onChange={(e) =>
                                updateGuest(guest.id, 'age', parseInt(e.target.value) || 0)
                              }
                              className="h-9"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-sm">Email</Label>
                          <Input
                            data-testid="guest-email"
                            type="email"
                            placeholder="john@example.com"
                            value={guest.email || ''}
                            onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                            className="h-9"
                            disabled={guest.isExisting}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Phone</Label>
                          <Input
                            data-testid="guest-phone"
                            type="tel"
                            placeholder="+385 99 123 4567"
                            value={guest.phone || ''}
                            onChange={(e) => updateGuest(guest.id, 'phone', e.target.value)}
                            className="h-9"
                            disabled={guest.isExisting}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Nationality</Label>
                          <Input
                            placeholder="Croatian"
                            value={guest.nationality || ''}
                            onChange={(e) => updateGuest(guest.id, 'nationality', e.target.value)}
                            className="h-9"
                            disabled={guest.isExisting}
                          />
                        </div>
                        {guest.type === 'child' && (
                          <div>
                            <Label className="text-sm">Date of Birth</Label>
                            <Input
                              type="date"
                              value={guest.dateOfBirth || ''}
                              onChange={(e) => updateGuest(guest.id, 'dateOfBirth', e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>

                      {guest.isExisting && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateGuest(guest.id, 'isExisting', false)}
                          className="mt-2 text-blue-600"
                        >
                          Switch to manual entry
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Car className="mr-2 h-4 w-4" />
                  Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Parking */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="parking"
                      checked={bookingServices.needsParking}
                      onChange={(e) =>
                        setBookingServices((prev) => ({
                          ...prev,
                          needsParking: e.target.checked,
                          parkingSpots: e.target.checked ? Math.max(1, prev.parkingSpots) : 0,
                        }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="parking" className="flex-1">
                      Parking Required
                    </Label>
                    {bookingServices.needsParking && (
                      <Input
                        type="number"
                        min="1"
                        max="3"
                        value={bookingServices.parkingSpots}
                        onChange={(e) =>
                          setBookingServices((prev) => ({
                            ...prev,
                            parkingSpots: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-16"
                      />
                    )}
                  </div>

                  {/* Pets */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="pets"
                      checked={bookingServices.hasPets}
                      onChange={(e) =>
                        setBookingServices((prev) => ({
                          ...prev,
                          hasPets: e.target.checked,
                          petCount: e.target.checked ? Math.max(1, prev.petCount) : 0,
                        }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="pets" className="flex-1">
                      Traveling with Pets
                    </Label>
                    {bookingServices.hasPets && (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={bookingServices.petCount}
                        onChange={(e) =>
                          setBookingServices((prev) => ({
                            ...prev,
                            petCount: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-16"
                      />
                    )}
                  </div>

                  {/* Special Requests */}
                  <div>
                    <Label htmlFor="requests">Special Requests</Label>
                    <textarea
                      id="requests"
                      value={bookingServices.specialRequests}
                      onChange={(e) =>
                        setBookingServices((prev) => ({
                          ...prev,
                          specialRequests: e.target.value,
                        }))
                      }
                      placeholder="Any special requests or notes..."
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Billing (R1) Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Building2 className="mr-2 h-4 w-4" />
                  Company Billing (R1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Checkbox for company billing */}
                <div className="flex items-center space-x-3 rounded-md border bg-gray-50 p-3">
                  <input
                    type="checkbox"
                    id="companyBilling"
                    checked={isCompanyBilling}
                    onChange={(e) => {
                      setIsCompanyBilling(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedCompanyId(null);
                      }
                    }}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="companyBilling" className="cursor-pointer font-medium">
                      Bill to Company (R1 Billing)
                    </Label>
                    <p className="mt-1 text-xs text-gray-500">
                      Invoice will be issued to the selected company instead of individual guest
                    </p>
                  </div>
                </div>

                {/* Company selection dropdown */}
                {isCompanyBilling && (
                  <div>
                    <Label>Select Company *</Label>
                    <select
                      value={selectedCompanyId || ''}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full rounded-md border bg-white p-2"
                      required={isCompanyBilling}
                    >
                      <option value="">-- Select a company --</option>
                      {companies
                        .filter((c) => c.isActive)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} (OIB: {company.oib})
                          </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      {companies.filter((c) => c.isActive).length} active compan
                      {companies.filter((c) => c.isActive).length === 1 ? 'y' : 'ies'} available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Label/Group Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Tag className="mr-2 h-4 w-4" />
                  Reservation Label/Group
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Label (Optional)</Label>
                  <p className="mb-2 text-xs text-gray-500">
                    Group related reservations together (e.g., "german-bikers" for a tour group)
                  </p>
                  {hotelId ? (
                    <LabelAutocomplete
                      hotelId={hotelId}
                      value={selectedLabelId}
                      onChange={setSelectedLabelId}
                      placeholder="Search or create label..."
                    />
                  ) : (
                    <div className="text-sm text-gray-400">Loading...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary — Charge Line Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Receipt className="mr-2 h-4 w-4" />
                  Pricing Summary
                  {chargesLoading && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {previewCharges.length === 0 && !chargesLoading ? (
                  <p className="text-sm text-gray-500 italic">
                    {isUnallocated || !selectedRoom
                      ? 'Select a room to see pricing.'
                      : 'Enter guest details to generate pricing.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-gray-500">
                          <th className="pb-1 font-medium">Description</th>
                          <th className="pb-1 text-right font-medium">Qty</th>
                          <th className="pb-1 text-right font-medium">Unit Price</th>
                          <th className="pb-1 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionOrder.map((chargeType) => {
                          const charges = chargesByType[chargeType];
                          if (!charges || charges.length === 0) return null;

                          const sectionLabel = chargeSectionLabels[chargeType] || chargeType;
                          const showHeader = !renderedSections.has(sectionLabel);
                          if (showHeader) renderedSections.add(sectionLabel);

                          return (
                            <React.Fragment key={chargeType}>
                              {showHeader && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase"
                                  >
                                    {sectionLabel}
                                  </td>
                                </tr>
                              )}
                              {charges.map((charge, idx) => (
                                <tr
                                  key={`${chargeType}-${idx}`}
                                  className={charge.total < 0 ? 'text-green-700' : ''}
                                >
                                  <td className="py-0.5 pr-2">{charge.description}</td>
                                  <td className="py-0.5 text-right">{charge.quantity}</td>
                                  <td className="py-0.5 text-right">
                                    {charge.unitPrice < 0 ? '-' : ''}€
                                    {Math.abs(charge.unitPrice).toFixed(2)}
                                  </td>
                                  <td className="py-0.5 text-right">
                                    {charge.total < 0 ? '-' : ''}€
                                    {Math.abs(charge.total).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 text-lg font-bold">
                          <td colSpan={3} className="pt-2">
                            Total
                          </td>
                          <td className="pt-2 text-right">€{chargeTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center"
                data-testid="submit-booking"
              >
                {isSubmitting && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
