import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Button } from '../../../../ui/button';
import { Textarea } from '../../../../ui/textarea';
import { Calendar, Save, X } from 'lucide-react';
import type { Reservation } from '../../../../../lib/queries/hooks/useReservations';
import type { Room } from '../../../../../lib/queries/hooks/useRooms';
import { ReservationState } from '../../../../../lib/hotel/hooks/useReservationState';

export interface ReservationDetailsCardProps {
  reservation: Reservation;
  room: Room;
  state: ReservationState;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

export const ReservationDetailsCard = ({
  reservation,
  room,
  state,
  onNoteChange,
  onSave,
  onCancelEdit,
}: ReservationDetailsCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Calendar className="h-5 w-5" />
        <span>Reservation Details</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Check-in</div>
          <div className="font-medium">
            {new Date(reservation.check_in_date).toLocaleDateString()}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Check-out</div>
          <div className="font-medium">
            {new Date(reservation.check_out_date).toLocaleDateString()}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Nights</div>
          <div className="font-medium">{reservation.number_of_nights ?? 1}</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Room Type</div>
          <div className="font-medium">{room.name_english}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-gray-500">Special Requests</div>
        {state.isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={state.editedNotes}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Enter special requests..."
              rows={3}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={onSave}>
                <Save className="mr-1 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="font-medium">{reservation.special_requests || 'None'}</div>
        )}
      </div>
    </CardContent>
  </Card>
);
