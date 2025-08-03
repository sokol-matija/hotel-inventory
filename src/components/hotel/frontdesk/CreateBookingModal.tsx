import React, { useState, useEffect, useMemo } from 'react';
import { addDays, format, differenceInDays, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { 
  X, 
  Users, 
  Baby, 
  Heart, 
  Car, 
  Calendar as CalendarIcon,
  Plus,
  Minus,
  CreditCard
} from 'lucide-react';
import { Room, Guest, GuestChild, ReservationStatus, Reservation } from '../../../lib/hotel/types';
import { SAMPLE_GUESTS } from '../../../lib/hotel/sampleData';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { calculatePricing } from '../../../lib/hotel/pricingCalculator';
import { getCountryFlag } from '../../../lib/hotel/countryFlags';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onCreateBooking: (bookingData: any) => void;
  preSelectedDates?: {checkIn: Date, checkOut: Date} | null;
  existingReservations?: Reservation[];
}

interface BookingFormData {
  selectedGuest: Guest | null;
  isNewGuest: boolean;
  newGuestData: {
    name: string;
    email: string;
    phone: string;
    nationality: string;
    hasPets: boolean;
  };
  checkIn: string;
  checkOut: string;
  adults: number;
  children: GuestChild[];
  specialRequests: string;
  hasPets: boolean;
  needsParking: boolean;
  status: ReservationStatus;
  bookingSource: 'booking.com' | 'direct' | 'other';
}

// Guest selector component
function GuestSelector({ 
  guests, 
  selectedGuest, 
  onSelectGuest, 
  isNewGuest, 
  onToggleNewGuest 
}: {
  guests: Guest[];
  selectedGuest: Guest | null;
  onSelectGuest: (guest: Guest | null) => void;
  isNewGuest: boolean;
  onToggleNewGuest: (isNew: boolean) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-4">
        <Label className="text-sm font-medium">Guest Selection</Label>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={!isNewGuest ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleNewGuest(false)}
          >
            Existing Guest
          </Button>
          <Button
            type="button"
            variant={isNewGuest ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleNewGuest(true)}
          >
            New Guest
          </Button>
        </div>
      </div>
      
      {!isNewGuest && (
        <div className="space-y-2">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto border rounded-md">
            {filteredGuests.map(guest => (
              <div
                key={guest.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                  selectedGuest?.id === guest.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => onSelectGuest(guest)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{guest.name}</span>
                      <span className="text-sm">{getCountryFlag(guest.nationality)}</span>
                      {guest.isVip && <Badge variant="secondary" className="text-xs">VIP</Badge>}
                    </div>
                    <div className="text-sm text-gray-500">{guest.email}</div>
                    <div className="text-xs text-gray-400 flex items-center space-x-2">
                      <span>{guest.totalStays} stays</span>
                      {guest.hasPets && <Heart className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Children manager component
function ChildrenManager({ 
  children, 
  onChange, 
  maxChildren 
}: { 
  children: GuestChild[]; 
  onChange: (children: GuestChild[]) => void;
  maxChildren: number;
}) {
  const addChild = () => {
    if (children.length < maxChildren) {
      const newChild: GuestChild = {
        name: `Child ${children.length + 1}`,
        dateOfBirth: new Date(new Date().getFullYear() - 8, 0, 1),
        age: 8
      };
      onChange([...children, newChild]);
    }
  };

  const removeChild = (index: number) => {
    onChange(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: keyof GuestChild, value: any) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate age when date of birth changes
    if (field === 'dateOfBirth') {
      const today = new Date();
      const birthDate = new Date(value);
      updated[index].age = today.getFullYear() - birthDate.getFullYear();
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Children</Label>
        {children.length < maxChildren && (
          <Button type="button" variant="outline" size="sm" onClick={addChild}>
            <Plus className="h-4 w-4 mr-1" />
            Add Child
          </Button>
        )}
      </div>
      
      {children.map((child, index) => (
        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
          <Input
            placeholder="Child name"
            value={child.name}
            onChange={(e) => updateChild(index, 'name', e.target.value)}
            className="flex-1"
          />
          <div className="flex items-center space-x-1">
            <Label className="text-xs">Age:</Label>
            <Input
              type="number"
              min="0"
              max="17"
              value={child.age}
              onChange={(e) => {
                const age = parseInt(e.target.value) || 0;
                updateChild(index, 'age', age);
                // Update date of birth based on age
                const birthYear = new Date().getFullYear() - age;
                updateChild(index, 'dateOfBirth', new Date(birthYear, 0, 1));
              }}
              className="w-16"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeChild(index)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {children.length === 0 && (
        <div className="text-sm text-gray-500 italic">No children added</div>
      )}
    </div>
  );
}

export default function CreateBookingModal({ 
  isOpen, 
  onClose, 
  room, 
  onCreateBooking,
  preSelectedDates,
  existingReservations = []
}: CreateBookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    selectedGuest: null,
    isNewGuest: false,
    newGuestData: {
      name: '',
      email: '',
      phone: '',
      nationality: 'German', // Default to most common nationality
      hasPets: false
    },
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    adults: 1,
    children: [],
    specialRequests: '',
    hasPets: false,
    needsParking: false,
    status: 'confirmed',
    bookingSource: 'direct'
  });

  // Pre-populate dates when provided from drag-to-create
  useEffect(() => {
    if (preSelectedDates) {
      setFormData(prev => ({
        ...prev,
        checkIn: format(preSelectedDates.checkIn, 'yyyy-MM-dd'),
        checkOut: format(preSelectedDates.checkOut, 'yyyy-MM-dd')
      }));
    }
  }, [preSelectedDates]);

  // Date conflict validation
  const dateConflict = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return null;
    
    const checkInDate = startOfDay(new Date(formData.checkIn));
    const checkOutDate = startOfDay(new Date(formData.checkOut));
    
    // Check for conflicts with existing reservations in the same room
    const conflictingReservation = existingReservations.find(reservation => {
      if (reservation.roomId !== room.id) return false;
      
      const existingCheckIn = startOfDay(reservation.checkIn);
      const existingCheckOut = startOfDay(reservation.checkOut);
      
      // Check for date overlap
      return (
        (checkInDate >= existingCheckIn && checkInDate < existingCheckOut) ||
        (checkOutDate > existingCheckIn && checkOutDate <= existingCheckOut) ||
        (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
      );
    });
    
    return conflictingReservation;
  }, [formData.checkIn, formData.checkOut, room.id, existingReservations]);

  // Calculate pricing
  const pricingData = useMemo(() => {
    try {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      
      if (checkInDate >= checkOutDate) {
        return null;
      }
      
      return calculatePricing(
        room.id,
        checkInDate,
        checkOutDate,
        formData.adults,
        formData.children,
        {
          hasPets: formData.hasPets,
          needsParking: formData.needsParking,
          additionalCharges: 0
        }
      );
    } catch (error) {
      console.error('Pricing calculation error:', error);
      return null;
    }
  }, [room.id, formData.checkIn, formData.checkOut, formData.adults, formData.children, formData.hasPets, formData.needsParking]);

  // Validation
  const isFormValid = useMemo(() => {
    const hasDateConflict = !!dateConflict;
    
    if (formData.isNewGuest) {
      return formData.newGuestData.name.trim() !== '' &&
             formData.newGuestData.email.trim() !== '' &&
             formData.checkIn !== '' &&
             formData.checkOut !== '' &&
             new Date(formData.checkIn) < new Date(formData.checkOut) &&
             formData.adults > 0 &&
             (formData.adults + formData.children.length) <= room.maxOccupancy &&
             !hasDateConflict;
    } else {
      return formData.selectedGuest !== null &&
             formData.checkIn !== '' &&
             formData.checkOut !== '' &&
             new Date(formData.checkIn) < new Date(formData.checkOut) &&
             formData.adults > 0 &&
             (formData.adults + formData.children.length) <= room.maxOccupancy &&
             !hasDateConflict;
    }
  }, [formData, room.maxOccupancy, dateConflict]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid || !pricingData) {
      return;
    }

    // Create booking data
    const bookingData = {
      room,
      guest: formData.isNewGuest ? formData.newGuestData : formData.selectedGuest,
      isNewGuest: formData.isNewGuest,
      checkIn: new Date(formData.checkIn),
      checkOut: new Date(formData.checkOut),
      adults: formData.adults,
      children: formData.children,
      specialRequests: formData.specialRequests,
      hasPets: formData.hasPets,
      needsParking: formData.needsParking,
      status: formData.status,
      bookingSource: formData.bookingSource,
      pricing: pricingData
    };

    onCreateBooking(bookingData);
  };

  if (!isOpen) return null;

  const maxChildren = room.maxOccupancy - formData.adults;
  const nights = formData.checkIn && formData.checkOut 
    ? differenceInDays(new Date(formData.checkOut), new Date(formData.checkIn))
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Create New Booking</h2>
            <p className="text-gray-600">
              {formatRoomNumber(room)} - {getRoomTypeDisplay(room)} (Max {room.maxOccupancy} guests)
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Guest Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Guest Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GuestSelector
                    guests={SAMPLE_GUESTS}
                    selectedGuest={formData.selectedGuest}
                    onSelectGuest={(guest) => setFormData(prev => ({ ...prev, selectedGuest: guest }))}
                    isNewGuest={formData.isNewGuest}
                    onToggleNewGuest={(isNew) => setFormData(prev => ({ ...prev, isNewGuest: isNew }))}
                  />
                  
                  {formData.isNewGuest && (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="guestName">Full Name *</Label>
                          <Input
                            id="guestName"
                            value={formData.newGuestData.name}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              newGuestData: { ...prev.newGuestData, name: e.target.value }
                            }))}
                            placeholder="Enter guest name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guestEmail">Email *</Label>
                          <Input
                            id="guestEmail"
                            type="email"
                            value={formData.newGuestData.email}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              newGuestData: { ...prev.newGuestData, email: e.target.value }
                            }))}
                            placeholder="guest@email.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="guestPhone">Phone</Label>
                          <Input
                            id="guestPhone"
                            value={formData.newGuestData.phone}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              newGuestData: { ...prev.newGuestData, phone: e.target.value }
                            }))}
                            placeholder="+385 xx xxx xxxx"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guestNationality">Nationality</Label>
                          <select
                            id="guestNationality"
                            value={formData.newGuestData.nationality}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              newGuestData: { ...prev.newGuestData, nationality: e.target.value }
                            }))}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          >
                            <option value="German">🇩🇪 German</option>
                            <option value="Italian">🇮🇹 Italian</option>
                            <option value="Austrian">🇦🇹 Austrian</option>
                            <option value="British">🇬🇧 British</option>
                            <option value="Croatian">🇭🇷 Croatian</option>
                            <option value="Slovenian">🇸🇮 Slovenian</option>
                            <option value="French">🇫🇷 French</option>
                            <option value="Dutch">🇳🇱 Dutch</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stay Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stay Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="checkIn">Check-in Date *</Label>
                      <Input
                        id="checkIn"
                        type="date"
                        value={formData.checkIn}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                        className={dateConflict ? 'border-red-500 focus:border-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkOut">Check-out Date *</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={formData.checkOut}
                        min={formData.checkIn || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                        className={dateConflict ? 'border-red-500 focus:border-red-500' : ''}
                      />
                    </div>
                  </div>
                  
                  {/* Date conflict warning */}
                  {dateConflict && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">
                          Date Conflict Detected
                        </span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        This room is already booked during the selected dates. 
                        Please choose different dates or select another room.
                      </p>
                    </div>
                  )}
                  
                  {nights > 0 && (
                    <div className="text-sm text-gray-600 flex items-center space-x-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="adults">Adults *</Label>
                    <div className="flex items-center space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          adults: Math.max(1, prev.adults - 1) 
                        }))}
                        disabled={formData.adults <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{formData.adults}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          adults: Math.min(room.maxOccupancy, prev.adults + 1) 
                        }))}
                        disabled={formData.adults >= room.maxOccupancy}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ChildrenManager
                    children={formData.children}
                    onChange={(children) => setFormData(prev => ({ ...prev, children }))}
                    maxChildren={maxChildren}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Additional Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasPets"
                        checked={formData.hasPets}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasPets: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="hasPets" className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>Pets (+€20)</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="needsParking"
                        checked={formData.needsParking}
                        onChange={(e) => setFormData(prev => ({ ...prev, needsParking: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="needsParking" className="flex items-center space-x-1">
                        <Car className="h-4 w-4 text-blue-500" />
                        <span>Parking (+€7/night)</span>
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          status: e.target.value as ReservationStatus 
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="unallocated">Unallocated</option>
                        <option value="incomplete-payment">Incomplete Payment</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="bookingSource">Booking Source</Label>
                      <select
                        id="bookingSource"
                        value={formData.bookingSource}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          bookingSource: e.target.value as any 
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="direct">Direct</option>
                        <option value="booking.com">Booking.com</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="specialRequests">Special Requests</Label>
                    <Textarea
                      id="specialRequests"
                      value={formData.specialRequests}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                      placeholder="Any special requests or notes..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Summary */}
              {pricingData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Pricing Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Room rate × {nights} nights</span>
                        <span>€{pricingData.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {pricingData.totalDiscounts > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Children discounts</span>
                          <span>-€{pricingData.totalDiscounts.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span>Tourism tax</span>
                        <span>€{pricingData.fees.tourism.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>VAT (25%)</span>
                        <span>€{pricingData.fees.vat.toFixed(2)}</span>
                      </div>
                      
                      {pricingData.fees.pets > 0 && (
                        <div className="flex justify-between">
                          <span>Pet fee</span>
                          <span>€{pricingData.fees.pets.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {pricingData.fees.parking > 0 && (
                        <div className="flex justify-between">
                          <span>Parking fee</span>
                          <span>€{pricingData.fees.parking.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {pricingData.fees.shortStay > 0 && (
                        <div className="flex justify-between">
                          <span>Short stay supplement (20%)</span>
                          <span>€{pricingData.fees.shortStay.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total Amount</span>
                        <span>€{pricingData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-500">
              {!isFormValid && (
                <span className="text-red-500">
                  {dateConflict 
                    ? "Please resolve the date conflict before creating the booking" 
                    : "Please fill in all required fields"
                  }
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid || !pricingData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Booking
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}