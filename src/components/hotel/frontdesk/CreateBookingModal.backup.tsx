import React, { useState, useEffect, useMemo } from 'react';
import { addDays, format, differenceInDays, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { SmartDatePicker } from '../../ui/smart-date-picker';
import { CalendarDatePicker } from '../../ui/calendar-date-picker';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { 
  X, 
  Heart, 
  Car, 
  Calendar as CalendarIcon,
  Plus,
  Minus,
  CreditCard
} from 'lucide-react';
import { Room, Guest, GuestChild, ReservationStatus, Reservation, Company } from '../../../lib/hotel/types';
import { SAMPLE_GUESTS } from '../../../lib/hotel/sampleData';
import { formatRoomNumber, getRoomTypeDisplay, getMaxCheckoutDate } from '../../../lib/hotel/calendarUtils';
import { HotelPricingEngine, PricingCalculationInput } from '../../../lib/hotel/pricingEngine';
import { getCountryFlag } from '../../../lib/hotel/countryFlags';
import { ntfyService, BookingNotificationData } from '../../../lib/ntfyService';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import CreateCompanyModal from '../companies/CreateCompanyModal';

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
  isR1Bill: boolean;
  selectedCompany: Company | null;
  pricingTierId: string;
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
  const { findCompaniesByName } = useHotel();
  const [companySearch, setCompanySearch] = useState('');
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCompanySuccess = () => {
    setIsCreateCompanyModalOpen(false);
    // Refresh company search if user was searching
    if (companySearch) {
      // The search will automatically update due to the useHotel() context update
    }
  };
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
    bookingSource: 'direct',
    isR1Bill: false,
    selectedCompany: null,
    pricingTierId: '2026-standard'
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
    const conflictingReservation = existingReservations?.find(reservation => {
      if (reservation.roomId !== room.id) return false;
      
      const existingCheckIn = startOfDay(reservation.checkIn);
      const existingCheckOut = startOfDay(reservation.checkOut);
      
      // Check for date overlap
      return (
        (checkInDate >= existingCheckIn && checkInDate < existingCheckOut) ||
        (checkOutDate > existingCheckIn && checkOutDate <= existingCheckOut) ||
        (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
      );
    }) || null;
    
    return conflictingReservation;
  }, [formData.checkIn, formData.checkOut, room.id, existingReservations]);

  // Room 401 validation
  const room401Validation = useMemo(() => {
    if (room.id !== '401' || !formData.checkIn || !formData.checkOut) return null;

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const pricingEngine = HotelPricingEngine.getInstance();
    
    return pricingEngine.validateRoom401Booking(checkInDate, checkOutDate, existingReservations);
  }, [room.id, formData.checkIn, formData.checkOut, existingReservations]);

  // Calculate maximum checkout date based on next reservation
  const maxCheckoutDate = useMemo(() => {
    if (!formData.checkIn) return null;
    
    const checkInDate = new Date(formData.checkIn);
    const maxDate = getMaxCheckoutDate(existingReservations, room.id, checkInDate);
    
    return maxDate ? format(maxDate, 'yyyy-MM-dd') : null;
  }, [formData.checkIn, room.id, existingReservations]);

  // Calculate pricing using new 2026 pricing engine
  const pricingData = useMemo(() => {
    try {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      
      if (checkInDate >= checkOutDate) {
        return null;
      }
      
      const pricingEngine = HotelPricingEngine.getInstance();
      const input: PricingCalculationInput = {
        roomType: room.type,
        roomId: room.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: formData.adults,
        children: formData.children,
        hasPets: formData.hasPets,
        needsParking: formData.needsParking,
        pricingTierId: formData.pricingTierId,
        isR1Bill: formData.isR1Bill,
        companyId: formData.selectedCompany?.id,
        isRoom401: room.id === '401'
      };
      
      return pricingEngine.calculatePricing(input);
    } catch (error) {
      console.error('Pricing calculation error:', error);
      return null;
    }
  }, [room.id, room.type, formData.checkIn, formData.checkOut, formData.adults, formData.children, formData.hasPets, formData.needsParking, formData.pricingTierId, formData.isR1Bill, formData.selectedCompany]);

  // Validation
  const isFormValid = useMemo(() => {
    const hasDateConflict = !!dateConflict;
    const hasRoom401Issues = room401Validation && !room401Validation.isValid;
    
    const basicValidation = formData.checkIn !== '' &&
                           formData.checkOut !== '' &&
                           new Date(formData.checkIn) < new Date(formData.checkOut) &&
                           formData.adults > 0 &&
                           (formData.adults + formData.children.length) <= room.maxOccupancy &&
                           !hasDateConflict &&
                           !hasRoom401Issues;
    
    if (formData.isNewGuest) {
      return formData.newGuestData.name.trim() !== '' &&
             formData.newGuestData.email.trim() !== '' &&
             basicValidation;
    } else {
      return formData.selectedGuest !== null && basicValidation;
    }
  }, [formData, room.maxOccupancy, dateConflict, room401Validation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission and date conflicts
    if (isSubmitting || !isFormValid || !pricingData || dateConflict) {
      console.log('Submit blocked:', { 
        isSubmitting, 
        isFormValid, 
        hasPricingData: !!pricingData,
        hasDateConflict: !!dateConflict 
      });
      
      if (dateConflict) {
        const guest = SAMPLE_GUESTS.find(g => g.id === dateConflict.guestId);
        const conflictingGuestName = guest?.name || dateConflict.guestId || 'Unknown Guest';
        alert(`Cannot create booking - room is already reserved by ${conflictingGuestName} for these dates. Please select different dates.`);
      }
      return;
    }

    setIsSubmitting(true);
    console.log('🚀 Starting booking creation...');

    try {
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
        pricing: pricingData,
        isR1Bill: formData.isR1Bill,
        companyId: formData.selectedCompany?.id || null
      };

      // Send ntfy notification for room 401 bookings
      const guestName = formData.isNewGuest 
        ? formData.newGuestData.name 
        : formData.selectedGuest?.name || 'Unknown Guest';

      const notificationData: BookingNotificationData = {
        roomNumber: room.number,
        guestName,
        checkIn: format(new Date(formData.checkIn), 'dd.MM.yyyy'),
        checkOut: format(new Date(formData.checkOut), 'dd.MM.yyyy'),
        nights: pricingData.nights,
        adults: formData.adults,
        children: formData.children.length,
        bookingSource: formData.bookingSource,
        totalAmount: parseFloat(pricingData.grandTotal.toFixed(2)) // Fix price precision
      };

      // Send notification (don't block booking creation if notification fails)
      try {
        await ntfyService.sendRoom401BookingNotification(notificationData);
      } catch (error) {
        console.error('Failed to send booking notification:', error);
      }

      console.log('📝 Calling onCreateBooking...');
      await onCreateBooking(bookingData);
      console.log('✅ Booking created successfully');
      
      // Modal will be closed by parent component after successful creation
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
      console.log('🔄 Submit state reset');
    }
  };

  if (!isOpen) return null;

  const maxChildren = room.maxOccupancy - formData.adults;
  const nights = pricingData?.nights || (formData.checkIn && formData.checkOut 
    ? differenceInDays(new Date(formData.checkOut), new Date(formData.checkIn))
    : 0);

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

              {/* Pricing Tier Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing & Rate Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pricingTier">Rate Type</Label>
                    <select
                      id="pricingTier"
                      value={formData.pricingTierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricingTierId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="2025-standard">2025 Standard Rates</option>
                      <option value="2026-standard">2026 Standard Rates (New ⭐)</option>
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      Select the pricing structure for this reservation
                    </div>
                  </div>
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
                      <CalendarDatePicker
                        id="checkIn"
                        label="Check-in Date"
                        value={formData.checkIn}
                        onChange={(value) => setFormData(prev => ({ ...prev, checkIn: value }))}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        required
                        reservations={existingReservations}
                        roomId={room.id}
                        className={dateConflict ? 'border-red-500 focus:border-red-500' : ''}
                      />
                    </div>
                    <div>
                      <SmartDatePicker
                        id="checkOut"
                        label="Check-out Date"
                        value={formData.checkOut}
                        onChange={(value) => setFormData(prev => ({ ...prev, checkOut: value }))}
                        min={formData.checkIn || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        max={maxCheckoutDate || undefined}
                        required
                        reservations={existingReservations}
                        roomId={room.id}
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
                  
                  {/* Room 401 validation warnings */}
                  {room401Validation && !room401Validation.isValid && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <X className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-700 font-medium">
                          Room 401 Booking Requirements
                        </span>
                      </div>
                      {room401Validation.errors.map((error, index) => (
                        <p key={index} className="text-sm text-amber-600 mt-1">
                          {error}
                        </p>
                      ))}
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

                    {/* R1 Corporate Billing Toggle */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isR1Bill"
                        checked={formData.isR1Bill}
                        onChange={(e) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            isR1Bill: e.target.checked,
                            selectedCompany: e.target.checked ? prev.selectedCompany : null 
                          }));
                          if (!e.target.checked) {
                            setCompanySearch('');
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <Label htmlFor="isR1Bill" className="text-sm font-medium">
                        R1 Corporate Bill 🏢
                      </Label>
                    </div>

                    {/* Company Selection (shown when R1 is enabled) */}
                    {formData.isR1Bill && (
                      <div>
                        <Label htmlFor="companySearch">Select Company</Label>
                        <div className="relative">
                          <input
                            type="text"
                            id="companySearch"
                            placeholder="Search by company name or OIB..."
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                          
                          {/* Company dropdown results */}
                          {companySearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {findCompaniesByName(companySearch).length > 0 ? (
                                findCompaniesByName(companySearch).map((company) => (
                                  <button
                                    key={company.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, selectedCompany: company }));
                                      setCompanySearch(`${company.name} (${company.oib})`);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100"
                                  >
                                    <div className="font-medium">{company.name}</div>
                                    <div className="text-sm text-gray-600">OIB: {company.oib}</div>
                                    <div className="text-xs text-gray-500">{company.city}, {company.country}</div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-gray-500 text-sm">
                                  No companies found. <button 
                                    type="button" 
                                    onClick={() => setIsCreateCompanyModalOpen(true)}
                                    className="text-blue-600 underline hover:text-blue-800"
                                  >
                                    Create new company
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Selected company display */}
                          {formData.selectedCompany && !companySearch && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="font-medium text-blue-800">{formData.selectedCompany.name}</div>
                              <div className="text-sm text-blue-600">OIB: {formData.selectedCompany.oib}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, selectedCompany: null }));
                                  setCompanySearch('');
                                }}
                                className="text-xs text-red-600 hover:underline mt-1"
                              >
                                Remove company
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                    {/* Room Rate Information */}
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="flex justify-between items-center">
                        <span>Pricing Tier: {formData.pricingTierId === '2026-standard' ? '2026 Standard' : '2025 Standard'}</span>
                        <Badge variant="outline" className="text-xs">Period {pricingData.seasonalPeriod}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Accommodation */}
                      <div className="flex justify-between">
                        <span>
                          {room.id === '401' ? 'Room rate (per apartment)' : `Room rate × ${nights} nights`}
                        </span>
                        <span>€{pricingData.accommodationSubtotal.toFixed(2)}</span>
                      </div>
                      
                      {/* Children Discounts */}
                      {pricingData.discounts.totalDiscounts > 0 && (
                        <>
                          {pricingData.discounts.children0to3.amount > 0 && (
                            <div className="flex justify-between text-green-600 text-xs pl-2">
                              <span>Children 0-3 discount ({pricingData.discounts.children0to3.count}× free)</span>
                              <span>-€{pricingData.discounts.children0to3.amount.toFixed(2)}</span>
                            </div>
                          )}
                          {pricingData.discounts.children3to7.amount > 0 && (
                            <div className="flex justify-between text-green-600 text-xs pl-2">
                              <span>Children 3-7 discount ({pricingData.discounts.children3to7.count}× 50%)</span>
                              <span>-€{pricingData.discounts.children3to7.amount.toFixed(2)}</span>
                            </div>
                          )}
                          {pricingData.discounts.children7to14.amount > 0 && (
                            <div className="flex justify-between text-green-600 text-xs pl-2">
                              <span>Children 7-14 discount ({pricingData.discounts.children7to14.count}× 20%)</span>
                              <span>-€{pricingData.discounts.children7to14.amount.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Short Stay Supplement */}
                      {pricingData.shortStaySupplement > 0 && (
                        <div className="flex justify-between">
                          <span>Short stay supplement (+20%)</span>
                          <span>€{pricingData.shortStaySupplement.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Accommodation Subtotal */}
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Accommodation subtotal</span>
                        <span>€{pricingData.accommodationTotal.toFixed(2)}</span>
                      </div>

                      {/* Additional Services */}
                      {pricingData.services.tourism.total > 0 && (
                        <div className="flex justify-between">
                          <span>Tourism tax</span>
                          <span>€{pricingData.services.tourism.total.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {pricingData.services.parking.total > 0 && (
                        <div className="flex justify-between">
                          <span>Parking ({pricingData.services.parking.nights} nights)</span>
                          <span>€{pricingData.services.parking.total.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {pricingData.services.pets.total > 0 && (
                        <div className="flex justify-between">
                          <span>Pet fee</span>
                          <span>€{pricingData.services.pets.total.toFixed(2)}</span>
                        </div>
                      )}

                      {/* VAT Breakdown */}
                      <div className="border-t pt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Accommodation VAT (13% included)</span>
                          <span>€{pricingData.vat.accommodationVAT.toFixed(2)}</span>
                        </div>
                        {pricingData.vat.servicesVAT > 0 && (
                          <div className="flex justify-between">
                            <span>Services VAT (25%)</span>
                            <span>€{pricingData.vat.servicesVAT.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Grand Total</span>
                        <span>€{pricingData.grandTotal.toFixed(2)}</span>
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
                    : room401Validation && !room401Validation.isValid
                    ? "Please resolve Room 401 requirements before creating the booking"
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
                disabled={!isFormValid || !pricingData || isSubmitting}
                className={`bg-blue-600 hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : 'Create Booking'}
              </Button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={handleCreateCompanySuccess}
      />
    </div>
  );
}