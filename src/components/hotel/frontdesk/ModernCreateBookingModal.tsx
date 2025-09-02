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
  Phone
} from 'lucide-react';
import { Room } from '../../../lib/hotel/types';
import hotelNotification from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';

interface ModernCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  currentDate?: Date;
  preSelectedDates?: {checkIn: Date, checkOut: Date} | null;
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: 'adult' | 'child';
  age?: number;
}

export default function ModernCreateBookingModal({
  isOpen,
  onClose,
  room,
  currentDate,
  preSelectedDates
}: ModernCreateBookingModalProps) {
  // Basic booking info
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut || new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );
  
  // Guest management - simple approach
  const [guests, setGuests] = useState<Guest[]>([
    {
      id: '1',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      type: 'adult'
    }
  ]);
  
  // Simple booking-level services (not per guest)
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
    petFee: 0,
    parkingFee: 0,
    tourismTax: 0,
    vatAmount: 0,
    total: 120
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate pricing whenever dependencies change
  useEffect(() => {
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    const baseRate = 120; // Get from room pricing service
    const roomTotal = baseRate * nights;
    
    // Simple children discount calculation
    const children = guests.filter(g => g.type === 'child');
    const childrenDiscount = children.reduce((total, child) => {
      if (child.age && child.age < 3) return total + 0; // Free under 3
      if (child.age && child.age <= 12) return total + (baseRate * nights * 0.3); // 30% discount 3-12
      return total; // Full price 13+
    }, 0);
    
    // Simple service fees
    const petFee = bookingServices.hasPets ? bookingServices.petCount * 20 : 0;
    const parkingFee = bookingServices.needsParking ? bookingServices.parkingSpots * 7 * nights : 0;
    
    const subtotal = roomTotal - childrenDiscount + petFee + parkingFee;
    const adults = guests.filter(g => g.type === 'adult').length;
    const adultChildren = children.filter(c => c.age && c.age >= 18).length;
    const tourismTax = (adults + adultChildren) * 1.5 * nights; // €1.50 per adult per night
    const vatAmount = subtotal * 0.25; // 25% Croatian VAT
    const total = subtotal + tourismTax + vatAmount;
    
    setPricing({
      nights,
      baseRate,
      roomTotal,
      childrenDiscount,
      petFee,
      parkingFee,
      tourismTax,
      vatAmount,
      total
    });
  }, [checkInDate, checkOutDate, guests, bookingServices]);

  // Guest management functions
  const addGuest = () => {
    const newGuest: Guest = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      type: 'adult'
    };
    setGuests([...guests, newGuest]);
  };

  const removeGuest = (guestId: string) => {
    if (guests.length > 1) {
      setGuests(guests.filter(g => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: keyof Guest, value: string | number) => {
    setGuests(guests.map(g => 
      g.id === guestId ? { ...g, [field]: value } : g
    ));
  };

  // Form validation
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Date validation
    if (checkOutDate <= checkInDate) {
      errors.push('Check-out date must be after check-in date');
    }
    
    // At least one guest with basic info
    const primaryGuest = guests[0];
    if (!primaryGuest.firstName.trim()) {
      errors.push('Primary guest first name is required');
    }
    if (!primaryGuest.lastName.trim()) {
      errors.push('Primary guest last name is required');
    }
    if (primaryGuest.email.trim() && !primaryGuest.email.includes('@')) {
      errors.push('Primary guest email must be valid if provided');
    }
    
    // Email uniqueness check
    const usedEmails = new Set<string>();
    guests.forEach((guest, index) => {
      if (guest.email.trim()) {
        const email = guest.email.toLowerCase();
        if (usedEmails.has(email)) {
          errors.push(`Guest ${index + 1} has duplicate email address`);
        } else {
          usedEmails.add(email);
        }
      }
    });
    
    // Occupancy validation
    if (guests.length > room.maxOccupancy) {
      errors.push(`Total guests (${guests.length}) exceeds room capacity (${room.maxOccupancy})`);
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
      
      // Create reservation first
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          room_id: room.id,
          check_in: checkInDate.toISOString().split('T')[0],
          check_out: checkOutDate.toISOString().split('T')[0],
          adults: guests.filter(g => g.type === 'adult').length,
          children_count: guests.filter(g => g.type === 'child').length,
          status: 'confirmed',
          total_amount: pricing.total,
          special_requests: bookingServices.specialRequests || null,
          has_pets: bookingServices.hasPets,
          pet_count: bookingServices.petCount,
          parking_required: bookingServices.needsParking
        })
        .select()
        .single();

      if (reservationError) throw reservationError;
      
      // Create guests and relationships
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        // Generate unique email if empty to avoid constraint violations
        const email = guest.email.trim() || `guest_${Date.now()}_${i}@placeholder.local`;
        
        // Create guest
        const { data: createdGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: guest.firstName,
            last_name: guest.lastName,
            email: email,
            phone: guest.phone || null
          })
          .select()
          .single();

        if (guestError) throw guestError;
        
        // Set primary guest
        if (i === 0) {
          await supabase
            .from('reservations')
            .update({ guest_id: createdGuest.id })
            .eq('id', reservation.id);
        }
        
        // Create reservation-guest relationship
        await supabase
          .from('reservation_guests')
          .insert({
            reservation_id: reservation.id,
            guest_id: createdGuest.id
          });
        
        // Create guest stay (same dates for all guests initially)
        await supabase
          .from('guest_stays')
          .insert({
            reservation_id: reservation.id,
            guest_id: createdGuest.id,
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0]
          });
      }
      
      const primaryGuest = guests[0];
      const totalGuests = guests.length;
      
      hotelNotification.success(
        'Booking Created Successfully!',
        `Reservation for ${primaryGuest.firstName} ${primaryGuest.lastName} ` +
        `${totalGuests > 1 ? `and ${totalGuests - 1} other guest${totalGuests > 2 ? 's' : ''}` : ''} ` +
        `in Room ${room.number} has been created. You can now edit individual guest details if needed.`
      );
      
      onClose();
      
    } catch (error: any) {
      console.error('Booking creation failed:', error);
      
      if (error?.code === '23505' && error?.message?.includes('guests_email_key')) {
        hotelNotification.error(
          'Email Already Exists', 
          'One of the guest email addresses already exists in the system. Please use different email addresses.'
        );
      } else {
        hotelNotification.error('Booking Failed', 'Unable to create booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
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
            Create booking with shared check-in/check-out dates. Individual guest management available after creation.
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
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Check-out Date</Label>
                    <Input
                      type="date"
                      value={checkOutDate.toISOString().split('T')[0]}
                      onChange={(e) => setCheckOutDate(new Date(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {pricing.nights} night{pricing.nights !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>

            {/* Guests Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Guests ({guests.length})
                  </CardTitle>
                  <Button
                    type="button"
                    onClick={addGuest}
                    size="sm"
                    variant="outline"
                    disabled={guests.length >= room.maxOccupancy}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Guest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {guests.map((guest, index) => (
                    <div key={guest.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {guest.type === 'adult' ? (
                            <Users className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Baby className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium">
                            {index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={guest.type}
                            onChange={(e) => updateGuest(guest.id, 'type', e.target.value)}
                            className="text-sm border rounded px-2 py-1"
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
                              <Minus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">First Name</Label>
                          <Input
                            placeholder="John"
                            value={guest.firstName}
                            onChange={(e) => updateGuest(guest.id, 'firstName', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Last Name</Label>
                          <Input
                            placeholder="Doe"
                            value={guest.lastName}
                            onChange={(e) => updateGuest(guest.id, 'lastName', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        {guest.type === 'child' && (
                          <div>
                            <Label className="text-xs">Age</Label>
                            <Input
                              type="number"
                              placeholder="12"
                              min="0"
                              max="17"
                              value={guest.age || ''}
                              onChange={(e) => updateGuest(guest.id, 'age', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            Email {index === 0 && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            value={guest.email}
                            onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            Phone
                          </Label>
                          <Input
                            type="tel"
                            placeholder="+385 99 123 4567"
                            value={guest.phone}
                            onChange={(e) => updateGuest(guest.id, 'phone', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Booking Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parking */}
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="flex items-center">
                        <Car className="h-4 w-4 mr-2 text-blue-600" />
                        Parking
                      </Label>
                      <input
                        type="checkbox"
                        checked={bookingServices.needsParking}
                        onChange={(e) => setBookingServices(prev => ({
                          ...prev,
                          needsParking: e.target.checked,
                          parkingSpots: e.target.checked ? Math.max(1, prev.parkingSpots) : 0
                        }))}
                        className="w-4 h-4"
                      />
                    </div>
                    {bookingServices.needsParking && (
                      <div>
                        <Label className="text-xs">Number of parking spots</Label>
                        <Input
                          type="number"
                          min="1"
                          max="3"
                          value={bookingServices.parkingSpots}
                          onChange={(e) => setBookingServices(prev => ({
                            ...prev,
                            parkingSpots: parseInt(e.target.value) || 1
                          }))}
                          className="h-8 text-sm mt-1"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          €7 per spot per night
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pets */}
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="flex items-center">
                        <PawPrint className="h-4 w-4 mr-2 text-green-600" />
                        Pets
                      </Label>
                      <input
                        type="checkbox"
                        checked={bookingServices.hasPets}
                        onChange={(e) => setBookingServices(prev => ({
                          ...prev,
                          hasPets: e.target.checked,
                          petCount: e.target.checked ? Math.max(1, prev.petCount) : 0
                        }))}
                        className="w-4 h-4"
                      />
                    </div>
                    {bookingServices.hasPets && (
                      <div>
                        <Label className="text-xs">Number of pets</Label>
                        <Input
                          type="number"
                          min="1"
                          max="2"
                          value={bookingServices.petCount}
                          onChange={(e) => setBookingServices(prev => ({
                            ...prev,
                            petCount: parseInt(e.target.value) || 1
                          }))}
                          className="h-8 text-sm mt-1"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          €20 per pet total fee
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Special Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any special requests or notes for this booking..."
                  value={bookingServices.specialRequests}
                  onChange={(e) => setBookingServices(prev => ({
                    ...prev,
                    specialRequests: e.target.value
                  }))}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Room ({pricing.nights} nights × €{pricing.baseRate})</span>
                    <span>€{pricing.roomTotal.toFixed(2)}</span>
                  </div>
                  {pricing.childrenDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Children discount</span>
                      <span>-€{pricing.childrenDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {pricing.parkingFee > 0 && (
                    <div className="flex justify-between">
                      <span>Parking ({bookingServices.parkingSpots} spots)</span>
                      <span>€{pricing.parkingFee.toFixed(2)}</span>
                    </div>
                  )}
                  {pricing.petFee > 0 && (
                    <div className="flex justify-between">
                      <span>Pet fee ({bookingServices.petCount} pets)</span>
                      <span>€{pricing.petFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tourism tax</span>
                    <span>€{pricing.tourismTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (25%)</span>
                    <span>€{pricing.vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>€{pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}