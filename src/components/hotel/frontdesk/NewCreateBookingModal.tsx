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
  Plus,
  Baby,
  CreditCard,
  Users,
  Car
} from 'lucide-react';
import { Room, Guest } from '../../../lib/hotel/types';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import hotelNotification from '../../../lib/notifications';
import { reservationAdapter } from '../../../services/ReservationAdapter';

interface Child {
  id: string;
  age: number;
}

interface BookingGuest {
  id: string;
  type: 'existing' | 'new';
  existingGuest?: Guest;
  newGuestData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality: string;
  };
}

interface NewCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  currentDate?: Date;
  preSelectedDates?: {checkIn: Date, checkOut: Date} | null;
}

export default function NewCreateBookingModal({
  isOpen,
  onClose,
  room,
  currentDate,
  preSelectedDates
}: NewCreateBookingModalProps) {
  const { guests, createGuest } = useHotel();
  
  // Form state
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut || new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );
  
  // Guests management
  const [bookingGuests, setBookingGuests] = useState<BookingGuest[]>([{
    id: '1',
    type: 'new',
    newGuestData: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: ''
    }
  }]);
  
  // Children management
  const [children, setChildren] = useState<Child[]>([]);
  
  // Additional options
  const [hasPets, setHasPets] = useState(false);
  const [needsParking, setNeedsParking] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Pricing state
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
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate nights
  useEffect(() => {
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    const baseRate = 120; // Base room rate per night
    let roomTotal = baseRate * nights;
    
    // Children discount (30% for ages 3-12, free under 3)
    const childrenDiscount = children.reduce((total, child) => {
      if (child.age < 3) return total + 0; // Free
      if (child.age <= 12) return total + (baseRate * nights * 0.3); // 30% discount
      return total; // Full price for 13+
    }, 0);
    
    const petFee = hasPets ? 20 : 0;
    const parkingFee = needsParking ? 7 * nights : 0;
    const subtotal = roomTotal - childrenDiscount + petFee + parkingFee;
    const tourismTax = (bookingGuests.length + children.filter(c => c.age >= 18).length) * 1.5 * nights;
    const vatAmount = subtotal * 0.25; // 25% VAT
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
  }, [checkInDate, checkOutDate, bookingGuests.length, children, hasPets, needsParking]);

  // Guest management functions
  const addGuest = () => {
    const newGuest: BookingGuest = {
      id: Date.now().toString(),
      type: 'new',
      newGuestData: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        nationality: ''
      }
    };
    setBookingGuests([...bookingGuests, newGuest]);
  };

  const removeGuest = (guestId: string) => {
    if (bookingGuests.length > 1) {
      setBookingGuests(bookingGuests.filter(g => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, updates: Partial<BookingGuest>) => {
    setBookingGuests(bookingGuests.map(g => 
      g.id === guestId ? { ...g, ...updates } : g
    ));
  };

  const updateNewGuestData = (guestId: string, field: string, value: string) => {
    setBookingGuests(bookingGuests.map(g => 
      g.id === guestId ? {
        ...g,
        newGuestData: { ...g.newGuestData!, [field]: value }
      } : g
    ));
  };

  // Children management functions
  const addChild = () => {
    const newChild: Child = {
      id: Date.now().toString(),
      age: 5
    };
    setChildren([...children, newChild]);
  };

  const removeChild = (childId: string) => {
    setChildren(children.filter(c => c.id !== childId));
  };

  const updateChildAge = (childId: string, age: number) => {
    setChildren(children.map(c => 
      c.id === childId ? { ...c, age: Math.max(0, Math.min(17, age)) } : c
    ));
  };

  // Form validation
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Date validation
    if (checkOutDate <= checkInDate) {
      errors.push('Check-out date must be after check-in date');
    }
    
    // Guest validation and email uniqueness
    const usedEmails = new Set<string>();
    
    for (const guest of bookingGuests) {
      if (guest.type === 'new' && guest.newGuestData) {
        const { firstName, lastName, email } = guest.newGuestData;
        if (!firstName.trim()) errors.push('All guests must have a first name');
        if (!lastName.trim()) errors.push('All guests must have a last name');
        
        // Email validation - allow empty for additional guests (they'll get placeholder emails)
        if (email.trim()) {
          if (!email.includes('@')) {
            errors.push(`Invalid email format for ${firstName} ${lastName}`);
          } else if (usedEmails.has(email.toLowerCase())) {
            errors.push(`Email ${email} is used by multiple guests. Each guest must have a unique email.`);
          } else {
            usedEmails.add(email.toLowerCase());
          }
        }
      } else if (guest.type === 'existing' && !guest.existingGuest) {
        errors.push('Please select an existing guest or switch to new guest');
      } else if (guest.type === 'existing' && guest.existingGuest) {
        // Check existing guest email uniqueness
        if (guest.existingGuest.email && usedEmails.has(guest.existingGuest.email.toLowerCase())) {
          errors.push(`Email ${guest.existingGuest.email} is used by multiple guests. Each guest must have a unique email.`);
        } else if (guest.existingGuest.email) {
          usedEmails.add(guest.existingGuest.email.toLowerCase());
        }
      }
    }
    
    // Occupancy validation
    const totalOccupancy = bookingGuests.length + children.length;
    if (totalOccupancy > room.maxOccupancy) {
      errors.push(`Total occupancy (${totalOccupancy}) exceeds room capacity (${room.maxOccupancy})`);
    }
    
    return errors;
  };;

  // Form submission using clean ReservationAdapter
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
      
      // Prepare all guests for the reservation
      const allGuests = [];
      
      // Process all booking guests (adults)
      for (let i = 0; i < bookingGuests.length; i++) {
        const bookingGuest = bookingGuests[i];
        
        if (bookingGuest.type === 'new' && bookingGuest.newGuestData) {
          // Create new guest - use actual email or make it unique if empty
          const email = bookingGuest.newGuestData.email.trim() || 
                       `guest${Date.now()}_${i}@placeholder.local`;
          
          const createdGuest = await createGuest({
            firstName: bookingGuest.newGuestData.firstName,
            lastName: bookingGuest.newGuestData.lastName,
            fullName: `${bookingGuest.newGuestData.firstName} ${bookingGuest.newGuestData.lastName}`,
            email: email,
            phone: bookingGuest.newGuestData.phone,
            nationality: bookingGuest.newGuestData.nationality,
            preferredLanguage: 'en',
            dietaryRestrictions: [],
            hasPets: i === 0 ? hasPets : false, // Only primary guest can have pets
            isVip: false,
            vipLevel: 0,
            children: i === 0 ? children.map(c => ({
              name: `Child (${c.age}y)`,
              age: c.age,
              dateOfBirth: new Date(new Date().getFullYear() - c.age, 0, 1)
            })) : [], // Only primary guest has children
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          allGuests.push({
            first_name: createdGuest.firstName,
            last_name: createdGuest.lastName,
            email: createdGuest.email,
            phone: createdGuest.phone,
            guest_type: 'adult' as const,
            // Can add custom check-in/check-out per guest in future
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0]
          });
          
        } else if (bookingGuest.existingGuest) {
          allGuests.push({
            first_name: bookingGuest.existingGuest.firstName,
            last_name: bookingGuest.existingGuest.lastName,
            email: bookingGuest.existingGuest.email,
            phone: bookingGuest.existingGuest.phone,
            guest_type: 'adult' as const,
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0]
          });
        } else {
          // Create placeholder guest with unique email
          const uniqueEmail = `placeholder_guest_${Date.now()}_${i}@hotel.placeholder`;
          
          const placeholderGuest = await createGuest({
            firstName: 'Guest',
            lastName: `${i + 1}`,
            fullName: `Guest ${i + 1}`,
            email: uniqueEmail,
            phone: '',
            nationality: '',
            preferredLanguage: 'en',
            dietaryRestrictions: [],
            hasPets: false,
            isVip: false,
            vipLevel: 0,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          allGuests.push({
            first_name: placeholderGuest.firstName,
            last_name: placeholderGuest.lastName,
            email: placeholderGuest.email,
            phone: placeholderGuest.phone,
            guest_type: 'adult' as const,
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0]
          });
        }
      }
      
      // Add children as separate guests - each with unique placeholder email
      for (let childIndex = 0; childIndex < children.length; childIndex++) {
        const child = children[childIndex];
        const uniqueChildEmail = `child_${Date.now()}_${childIndex}@hotel.placeholder`;
        
        allGuests.push({
          first_name: 'Child',
          last_name: `(${child.age}y)`,
          email: uniqueChildEmail, // Unique email to avoid constraint violations
          phone: '',
          guest_type: 'child' as const,
          check_in: checkInDate.toISOString().split('T')[0],
          check_out: checkOutDate.toISOString().split('T')[0]
        });
      }
      
      // Use our clean ReservationAdapter to create the reservation
      const result = await reservationAdapter.createReservationWithGuests({
        room_id: room.id.toString(),
        check_in: checkInDate.toISOString().split('T')[0],
        check_out: checkOutDate.toISOString().split('T')[0],
        guests: allGuests,
        status: 'confirmed'
      });
      
      if (result.success) {
        const primaryGuest = allGuests[0];
        const totalGuestCount = allGuests.length;
        const guestText = totalGuestCount === 1 ? 'guest' : 'guests';
        
        hotelNotification.success(
          'Booking Created Successfully',
          `Reservation for ${primaryGuest.first_name} ${primaryGuest.last_name} and ${totalGuestCount - 1} other ${guestText} in Room ${room.number} has been created with proper guest tracking.`
        );
        
        onClose();
      } else {
        throw new Error('Reservation creation failed');
      }
      
    } catch (error) {
      console.error('Booking creation failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error && error.message.includes('23505')) {
        hotelNotification.error('Duplicate Email Error', 
          'A guest with this email already exists. Please use different email addresses for each guest.');
      } else {
        hotelNotification.error('Booking Failed', 'Unable to create booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };;

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
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Date</Label>
                <Input
                  type="date"
                  value={checkInDate.toISOString().split('T')[0]}
                  onChange={(e) => setCheckInDate(new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>Check-out Date</Label>
                <Input
                  type="date"
                  value={checkOutDate.toISOString().split('T')[0]}
                  onChange={(e) => setCheckOutDate(new Date(e.target.value))}
                />
              </div>
            </div>

            {/* Guests Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Guests ({bookingGuests.length})
                </Label>
                <Button type="button" onClick={addGuest} size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Guest
                </Button>
              </div>
              
              {bookingGuests.map((guest, index) => (
                <Card key={guest.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium">Guest {index + 1}</h4>
                    <div className="flex items-center gap-2">
                      {/* Guest Type Toggle */}
                      <div className="flex rounded-lg border">
                        <Button
                          type="button"
                          size="sm"
                          variant={guest.type === 'new' ? 'default' : 'ghost'}
                          onClick={() => updateGuest(guest.id, { 
                            type: 'new', 
                            newGuestData: guest.newGuestData || {
                              firstName: '', lastName: '', email: '', phone: '', nationality: ''
                            }
                          })}
                          className="rounded-r-none"
                        >
                          New
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={guest.type === 'existing' ? 'default' : 'ghost'}
                          onClick={() => updateGuest(guest.id, { type: 'existing' })}
                          className="rounded-l-none"
                        >
                          Existing
                        </Button>
                      </div>
                      
                      {/* Remove Guest */}
                      {bookingGuests.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeGuest(guest.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {guest.type === 'existing' ? (
                    <div>
                      <Label>Select Existing Guest</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={guest.existingGuest?.id || ''}
                        onChange={(e) => {
                          const existingGuest = guests.find(g => g.id === e.target.value);
                          updateGuest(guest.id, { existingGuest });
                        }}
                      >
                        <option value="">Select a guest...</option>
                        {guests.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.fullName} - {g.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={guest.newGuestData?.firstName || ''}
                          onChange={(e) => updateNewGuestData(guest.id, 'firstName', e.target.value)}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input
                          value={guest.newGuestData?.lastName || ''}
                          onChange={(e) => updateNewGuestData(guest.id, 'lastName', e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={guest.newGuestData?.email || ''}
                          onChange={(e) => updateNewGuestData(guest.id, 'email', e.target.value)}
                          placeholder="guest@email.com"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={guest.newGuestData?.phone || ''}
                          onChange={(e) => updateNewGuestData(guest.id, 'phone', e.target.value)}
                          placeholder="+385 XX XXX XXXX"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Nationality</Label>
                        <Input
                          value={guest.newGuestData?.nationality || ''}
                          onChange={(e) => updateNewGuestData(guest.id, 'nationality', e.target.value)}
                          placeholder="German"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Children Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Children ({children.length})
                </Label>
                <Button type="button" onClick={addChild} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Child
                </Button>
              </div>
              
              {children.length > 0 && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {children.map((child, index) => (
                      <div key={child.id} className="flex items-center gap-3">
                        <Label className="min-w-0 flex-1">Child {index + 1} Age:</Label>
                        <Input
                          type="number"
                          min="0"
                          max="17"
                          value={child.age}
                          onChange={(e) => updateChildAge(child.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Badge variant="secondary" className="text-xs">
                          {child.age < 3 ? 'Free' : child.age <= 12 ? '30% off' : 'Full price'}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeChild(child.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <Label className="text-lg font-medium">Additional Options</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                  />
                  <span>Has Pets (+€20)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={needsParking}
                    onChange={(e) => setNeedsParking(e.target.checked)}
                  />
                  <span className="flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    Parking (+€7/night)
                  </span>
                </label>
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <Label>Special Requests</Label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>

            {/* Pricing Calculator */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Room ({pricing.nights} nights @ €{pricing.baseRate}/night)</span>
                  <span>€{pricing.roomTotal.toFixed(2)}</span>
                </div>
                
                {pricing.childrenDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Children Discount</span>
                    <span>-€{pricing.childrenDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {pricing.petFee > 0 && (
                  <div className="flex justify-between">
                    <span>Pet Fee</span>
                    <span>€{pricing.petFee.toFixed(2)}</span>
                  </div>
                )}
                
                {pricing.parkingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Parking ({pricing.nights} nights @ €7/night)</span>
                    <span>€{pricing.parkingFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Tourism Tax</span>
                  <span>€{pricing.tourismTax.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>VAT (25%)</span>
                  <span>€{pricing.vatAmount.toFixed(2)}</span>
                </div>
                
                <hr className="border-blue-300" />
                
                <div className="flex justify-between text-xl font-bold text-blue-800">
                  <span>Total Amount</span>
                  <span>€{pricing.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Creating...' : `Create Booking - €${pricing.total.toFixed(2)}`}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}