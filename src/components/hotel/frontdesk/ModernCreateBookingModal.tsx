import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import {
  X,
  Calendar as CalendarIcon,
  UserPlus,
  Minus,
  Baby,
  Car,
  PawPrint,
  CreditCard,
  Users,
  Mail,
  Phone,
  User,
  Search,
  Trash2,
  Receipt
} from 'lucide-react';
import { Room, Guest, GuestChild, RoomType } from '../../../lib/hotel/types';
import hotelNotification from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import GuestAutocomplete from './Guests/GuestAutocomplete';
import { getSeasonalPeriod } from '../../../lib/hotel/pricingCalculator';
import { HotelPricingEngine } from '../../../lib/hotel/pricingEngine';

interface ModernCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  currentDate?: Date;
  preSelectedDates?: {checkIn: Date, checkOut: Date} | null;
}


export default function ModernCreateBookingModal({
  isOpen,
  onClose,
  room,
  currentDate,
  preSelectedDates
}: ModernCreateBookingModalProps) {
  const { guests, createReservation, refreshData } = useHotel();
  
  // Basic booking info
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut || new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );
  
  // Enhanced guest management
  const [bookingGuests, setBookingGuests] = useState<Array<{
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
    children: any[];
    totalStays: number;
    createdAt: Date;
    updatedAt: Date;
  }>>([]);
  
  // Initialize with one adult guest
  useEffect(() => {
    if (bookingGuests.length === 0) {
      setBookingGuests([createEmptyGuest('adult')]);
    }
  }, []);
  
  // Simple booking-level services
  const [bookingServices, setBookingServices] = useState({
    needsParking: false,
    parkingSpots: 0,
    hasPets: false,
    petCount: 0,
    specialRequests: ''
  });
  
  // Pricing calculation
  const [pricing, setPricing] = useState({
    nights: 1,
    baseRate: 120,
    roomTotal: 120,
    childrenDiscount: 0,
    shortStaySupplement: 0,
    petFee: 0,
    parkingFee: 0,
    tourismTax: 0,
    vatAmount: 0,
    total: 120
  });
  
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
    updatedAt: new Date()
  });

  // Calculate pricing whenever dependencies change using HotelPricingEngine
  useEffect(() => {
    const pricingEngine = HotelPricingEngine.getInstance();

    // Prepare guest children data for the pricing engine
    const children: GuestChild[] = bookingGuests
      .filter(g => g.type === 'child' && g.age !== undefined)
      .map(g => {
        // Calculate approximate DOB from age if not provided
        let dob: Date;
        if (g.dateOfBirth) {
          dob = new Date(g.dateOfBirth);
        } else {
          const today = new Date();
          dob = new Date(today.getFullYear() - g.age!, today.getMonth(), today.getDate());
        }

        return {
          name: `${g.firstName} ${g.lastName}`.trim() || 'Child',
          age: g.age!,
          dateOfBirth: dob
        };
      });

    const adults = bookingGuests.filter(g => g.type === 'adult').length;

    // Calculate detailed pricing using the engine
    const calculation = pricingEngine.calculatePricing({
      roomType: room.type as RoomType,
      roomId: room.id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: Math.max(1, adults), // At least 1 adult
      children,
      hasPets: bookingServices.hasPets,
      needsParking: bookingServices.needsParking,
      pricingTierId: '2026-standard', // Use default 2026 pricing
      isRoom401: room.number === '401'
    });

    // Map the detailed calculation to the simpler pricing state format for the UI
    setPricing({
      nights: calculation.nights,
      baseRate: calculation.baseRoomRate,
      roomTotal: calculation.accommodationSubtotal,
      childrenDiscount: calculation.discounts.totalDiscounts,
      shortStaySupplement: calculation.shortStaySupplement,
      petFee: calculation.services.pets.total,
      parkingFee: calculation.services.parking.total,
      tourismTax: calculation.services.tourism.total,
      vatAmount: calculation.vat.totalVAT,
      total: calculation.grandTotal
    });
  }, [checkInDate, checkOutDate, bookingGuests, bookingServices, room]);

  // Guest management functions
  const addAdult = () => {
    if (bookingGuests.length < room.maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('adult')]);
    }
  };

  const addChild = () => {
    if (bookingGuests.length < room.maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('child')]);
    }
  };

  const removeGuest = (guestId: string) => {
    if (bookingGuests.length > 1) {
      setBookingGuests(bookingGuests.filter(g => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: string, value: string | number | boolean) => {
    setBookingGuests(bookingGuests.map(g => {
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
    }));
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
      updatedAt: guest.updatedAt || new Date()
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
    
    // Occupancy validation
    if (bookingGuests.length > room.maxOccupancy) {
      errors.push(`Total guests (${bookingGuests.length}) exceeds room capacity (${room.maxOccupancy})`);
    }
    
    // Service validation
    if (bookingServices.needsParking && bookingServices.parkingSpots <= 0) {
      errors.push('Please specify number of parking spots needed');
    }
    if (bookingServices.hasPets && bookingServices.petCount <= 0) {
      errors.push('Please specify number of pets');
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
            date_of_birth: primaryGuest.dateOfBirth || null
          })
          .select()
          .single();

        if (guestError) throw guestError;
        primaryGuestId = createdGuest.id;
      }
      
      // Create reservation
      const seasonalPeriod = getSeasonalPeriod(checkInDate);

      // Prepare reservation data for debugging
      const adultsCount = bookingGuests.filter(g => g.type === 'adult').length;
      const childrenCount = bookingGuests.filter(g => g.type === 'child').length;
      const reservationData = {
        guest_id: primaryGuestId,
        room_id: room.id,
        check_in_date: checkInDate.toISOString().split('T')[0],
        check_out_date: checkOutDate.toISOString().split('T')[0],
        adults: adultsCount,
        children_count: childrenCount,
        number_of_guests: adultsCount + childrenCount,
        status: 'confirmed',
        seasonal_period: seasonalPeriod,
        base_room_rate: pricing.baseRate,
        number_of_nights: pricing.nights,
        subtotal: pricing.roomTotal - pricing.childrenDiscount + pricing.shortStaySupplement + pricing.petFee + pricing.parkingFee,
        children_discounts: pricing.childrenDiscount,
        short_stay_supplement: pricing.shortStaySupplement,
        tourism_tax: pricing.tourismTax,
        vat_amount: pricing.vatAmount,
        pet_fee: pricing.petFee,
        parking_fee: pricing.parkingFee,
        total_amount: pricing.total,
        special_requests: bookingServices.specialRequests || null,
        has_pets: bookingServices.hasPets,
        parking_required: bookingServices.needsParking
      };

      // console.log('📊 BOOKING MODAL DEBUG - Reservation Data:', {
      //   reservationData,
      //   bookingGuests,
      //   pricing,
      //   bookingServices,
      //   seasonalPeriod,
      //   primaryGuestId
      // });

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) {
        console.error('❌ BOOKING MODAL ERROR - Reservation creation failed:', {
          error: reservationError,
          sentData: reservationData
        });
        throw reservationError;
      }

      // console.log('✅ BOOKING MODAL SUCCESS - Reservation created:', reservation);
      
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
              date_of_birth: guest.dateOfBirth || null
            })
            .select()
            .single();

          if (addGuestError) throw addGuestError;
          guestId = additionalGuest.id;
        }
        
        // Create reservation-guest relationship
        await supabase
          .from('reservation_guests')
          .insert({
            reservation_id: reservation.id,
            guest_id: guestId
          });
        
        // Create guest stay
        await supabase
          .from('guest_stays')
          .insert({
            reservation_id: reservation.id,
            guest_id: guestId,
            check_in: checkInDate.toISOString(),
            check_out: checkOutDate.toISOString()
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
            const dob = new Date(today.getFullYear() - guest.age, today.getMonth(), today.getDate());
            dateOfBirth = dob.toISOString().split('T')[0];
          }

          await supabase
            .from('guest_children')
            .insert({
              reservation_id: reservation.id,
              guest_id: guestId,
              name: `${guest.firstName} ${guest.lastName}`,
              age: guest.age,
              date_of_birth: dateOfBirth
            });
        }
      }
      
      const totalGuests = bookingGuests.length;
      const adults = bookingGuests.filter(g => g.type === 'adult').length;
      const children = bookingGuests.filter(g => g.type === 'child').length;
      
      hotelNotification.success(
        'Booking Created Successfully!',
        `Reservation for ${primaryGuest.firstName} ${primaryGuest.lastName} ` +
        `and ${totalGuests - 1} other guest${totalGuests > 2 ? 's' : ''} ` +
        `(${adults} adult${adults !== 1 ? 's' : ''}, ${children} child${children !== 1 ? 'ren' : ''}) ` +
        `in Room ${room.number} has been created.`
      );

      // Refresh the hotel data to show the new booking in the UI
      await refreshData();

      onClose();
      
    } catch (error: any) {
      console.error('Booking creation failed:', error);
      
      if (error?.code === '23505' && error?.message?.includes('guests_email_key')) {
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

  if (!isOpen) return null;

  const adultsCount = bookingGuests.filter(g => g.type === 'adult').length;
  const childrenCount = bookingGuests.filter(g => g.type === 'child').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto" data-testid="create-booking-modal">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Create Booking - Room {room.number}</span>
              <Badge variant="outline">{room.type}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 text-sm">
            {adultsCount} adult{adultsCount !== 1 ? 's' : ''}, {childrenCount} child{childrenCount !== 1 ? 'ren' : ''} • Max occupancy: {room.maxOccupancy}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Dates Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
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
                  {pricing.nights} night{pricing.nights !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Guests Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Guests ({bookingGuests.length}/{room.maxOccupancy})
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdult}
                      disabled={bookingGuests.length >= room.maxOccupancy}
                      className="flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Adult
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      disabled={bookingGuests.length >= room.maxOccupancy}
                      className="flex items-center"
                    >
                      <Baby className="h-4 w-4 mr-1" />
                      Add Child
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingGuests.map((guest, index) => (
                    <div key={guest.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
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
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Existing Guest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Guest Type Toggle */}
                          <select
                            value={guest.type}
                            onChange={(e) => updateGuest(guest.id, 'type', e.target.value)}
                            className="text-sm border rounded px-2 py-1"
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
                            onGuestSelect={(selectedGuest) => handleSelectExistingGuest(selectedGuest, index)}
                            onCreateNew={() => {}} // Not needed here
                            selectedGuest={null}
                            placeholder="Search existing guests..."
                            className="mt-1"
                          />
                        </div>
                      )}
                      
                      {/* Guest Details Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                              onChange={(e) => updateGuest(guest.id, 'age', parseInt(e.target.value) || 0)}
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
                <CardTitle className="text-lg flex items-center">
                  <Car className="h-4 w-4 mr-2" />
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
                      onChange={(e) => setBookingServices(prev => ({
                        ...prev,
                        needsParking: e.target.checked,
                        parkingSpots: e.target.checked ? Math.max(1, prev.parkingSpots) : 0
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="parking" className="flex-1">Parking Required</Label>
                    {bookingServices.needsParking && (
                      <Input
                        type="number"
                        min="1"
                        max="3"
                        value={bookingServices.parkingSpots}
                        onChange={(e) => setBookingServices(prev => ({
                          ...prev,
                          parkingSpots: parseInt(e.target.value) || 1
                        }))}
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
                      onChange={(e) => setBookingServices(prev => ({
                        ...prev,
                        hasPets: e.target.checked,
                        petCount: e.target.checked ? Math.max(1, prev.petCount) : 0
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="pets" className="flex-1">Traveling with Pets</Label>
                    {bookingServices.hasPets && (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={bookingServices.petCount}
                        onChange={(e) => setBookingServices(prev => ({
                          ...prev,
                          petCount: parseInt(e.target.value) || 1
                        }))}
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
                      onChange={(e) => setBookingServices(prev => ({
                        ...prev,
                        specialRequests: e.target.value
                      }))}
                      placeholder="Any special requests or notes..."
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Receipt className="h-4 w-4 mr-2" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Base Accommodation */}
                  <div className="flex justify-between">
                    <span>Base Accommodation ({adultsCount + childrenCount} guest{(adultsCount + childrenCount) !== 1 ? 's' : ''} × {pricing.nights} night{pricing.nights !== 1 ? 's' : ''})</span>
                    <span>€{pricing.roomTotal.toFixed(2)}</span>
                  </div>

                  {/* Children Discounts */}
                  {pricing.childrenDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Children Discount ({childrenCount} child{childrenCount !== 1 ? 'ren' : ''})</span>
                      <span>-€{pricing.childrenDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Accommodation Subtotal */}
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="font-medium">Accommodation Subtotal</span>
                    <span className="font-medium">€{(pricing.roomTotal - pricing.childrenDiscount).toFixed(2)}</span>
                  </div>

                  {/* Short Stay Supplement */}
                  {pricing.shortStaySupplement > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Short Stay Supplement (+20% for &lt;3 nights)</span>
                      <span>+€{pricing.shortStaySupplement.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Accommodation Total */}
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="font-medium">Accommodation Total (incl. VAT)</span>
                    <span className="font-medium">€{(pricing.roomTotal - pricing.childrenDiscount + pricing.shortStaySupplement).toFixed(2)}</span>
                  </div>

                  {/* Additional Services */}
                  {pricing.petFee > 0 && (
                    <div className="flex justify-between">
                      <span>Pet Fee (incl. VAT)</span>
                      <span>€{pricing.petFee.toFixed(2)}</span>
                    </div>
                  )}
                  {pricing.parkingFee > 0 && (
                    <div className="flex justify-between">
                      <span>Parking Fee (incl. VAT)</span>
                      <span>€{pricing.parkingFee.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Tourism Tax */}
                  <div className="flex justify-between">
                    <span>Tourism Tax ({adultsCount} adult{adultsCount !== 1 ? 's' : ''}{childrenCount > 0 ? ` + ${childrenCount} child` + (childrenCount !== 1 ? 'ren' : '') : ''})</span>
                    <span>€{pricing.tourismTax.toFixed(2)}</span>
                  </div>

                  {/* VAT Breakdown (for info only) */}
                  <div className="flex justify-between text-xs text-gray-500 italic border-t pt-1">
                    <span>VAT breakdown (13% accommodation, 25% services - already included in prices above)</span>
                    <span>€{pricing.vatAmount.toFixed(2)}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="border-t-2 pt-2 flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span>€{pricing.total.toFixed(2)}</span>
                  </div>
                </div>
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
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
                {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
