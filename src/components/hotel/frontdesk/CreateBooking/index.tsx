import {
  X,
  Calendar as CalendarIcon,
  UserPlus,
  Baby,
  Users,
  Car,
  Home,
  Building2,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import LabelAutocomplete from '../../shared/LabelAutocomplete';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { useCreateBookingForm } from './useCreateBookingForm';
import { BookingGuestRow } from './BookingGuestRow';
import { BookingPricingTable } from './BookingPricingTable';

export interface ModernCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  currentDate?: Date;
  preSelectedDates?: { checkIn: Date; checkOut: Date } | null;
  allowRoomSelection?: boolean;
  unallocatedMode?: boolean;
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
  const {
    selectedRoom,
    setSelectedRoom,
    isUnallocated,
    setIsUnallocated,
    availableRooms,
    hotelId,
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    numberOfNights,
    bookingGuests,
    addAdult,
    addChild,
    removeGuest,
    updateGuest,
    handleSelectExistingGuest,
    adultsCount,
    childrenCount,
    bookingServices,
    setBookingServices,
    isCompanyBilling,
    setIsCompanyBilling,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    selectedLabelId,
    setSelectedLabelId,
    previewCharges,
    chargesLoading,
    chargeTotal,
    chargesByType,
    isSubmitting,
    handleSubmit,
  } = useCreateBookingForm({
    room,
    currentDate,
    preSelectedDates,
    allowRoomSelection,
    unallocatedMode,
    onClose,
  });

  if (!isOpen) return null;

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
                    ? `Create Booking - Room ${selectedRoom.room_number}`
                    : 'Create Booking'}
              </span>
              {selectedRoom && (
                <Badge variant="outline">{selectedRoom.room_types?.code ?? ''}</Badge>
              )}
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
            {selectedRoom && !isUnallocated && ` • Max occupancy: ${selectedRoom.max_occupancy}`}
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
                  <div className="flex items-center space-x-3 rounded-md border bg-white p-3">
                    <input
                      type="checkbox"
                      id="unallocated"
                      checked={isUnallocated}
                      onChange={(e) => {
                        setIsUnallocated(e.target.checked);
                        if (e.target.checked) setSelectedRoom(null);
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

                  {!isUnallocated && (
                    <div>
                      <Label>Select Room</Label>
                      <select
                        value={selectedRoom?.id || ''}
                        onChange={(e) => {
                          const r = availableRooms.find((r) => r.id === Number(e.target.value));
                          setSelectedRoom(r || null);
                        }}
                        className="w-full rounded-md border p-2"
                        required={!isUnallocated}
                      >
                        <option value="">-- Select a room --</option>
                        {availableRooms
                          .sort((a, b) => a.room_number.localeCompare(b.room_number))
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} - {r.room_types?.code ?? ''} (Floor{' '}
                              {r.floor_number}, Max: {r.max_occupancy})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dates */}
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

            {/* Guests */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Users className="mr-2 h-4 w-4" />
                    Guests ({bookingGuests.length}/{selectedRoom?.max_occupancy || 10})
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdult}
                      disabled={bookingGuests.length >= (selectedRoom?.max_occupancy || 10)}
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
                      disabled={bookingGuests.length >= (selectedRoom?.max_occupancy || 10)}
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
                    <BookingGuestRow
                      key={guest.id}
                      guest={guest}
                      index={index}
                      onRemove={removeGuest}
                      onUpdate={updateGuest}
                      onSelectExisting={handleSelectExistingGuest}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Car className="mr-2 h-4 w-4" />
                  Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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

            {/* Company Billing (R1) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Building2 className="mr-2 h-4 w-4" />
                  Company Billing (R1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 rounded-md border bg-gray-50 p-3">
                  <input
                    type="checkbox"
                    id="companyBilling"
                    checked={isCompanyBilling}
                    onChange={(e) => {
                      setIsCompanyBilling(e.target.checked);
                      if (!e.target.checked) setSelectedCompanyId(null);
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

            {/* Label / Group */}
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

            {/* Pricing Summary */}
            <BookingPricingTable
              previewCharges={previewCharges}
              chargesLoading={chargesLoading}
              chargeTotal={chargeTotal}
              chargesByType={chargesByType}
              isUnallocated={isUnallocated}
              selectedRoom={selectedRoom}
            />

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
