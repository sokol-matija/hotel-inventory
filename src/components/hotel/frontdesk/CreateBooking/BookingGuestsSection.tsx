import { Users, UserPlus, Baby } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import { BookingGuestRow } from './BookingGuestRow';
import type { BookingGuest } from './types';

interface BookingGuestsSectionProps {
  bookingGuests: BookingGuest[];
  selectedRoom: Room | null;
  addAdult: () => void;
  addChild: () => void;
  removeGuest: (id: string) => void;
  updateGuest: (guestId: string, field: string, value: string | number | boolean) => void;
  handleSelectExistingGuest: (guest: Guest, guestIndex: number) => void;
}

export function BookingGuestsSection({
  bookingGuests,
  selectedRoom,
  addAdult,
  addChild,
  removeGuest,
  updateGuest,
  handleSelectExistingGuest,
}: BookingGuestsSectionProps) {
  const maxOccupancy = selectedRoom?.max_occupancy || 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Users className="mr-2 h-4 w-4" />
            Guests ({bookingGuests.length}/{maxOccupancy})
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAdult}
              disabled={bookingGuests.length >= maxOccupancy}
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
              disabled={bookingGuests.length >= maxOccupancy}
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
  );
}
