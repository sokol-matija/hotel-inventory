import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';
import { Calendar, FileText, Wrench } from 'lucide-react';
import type { Reservation } from '../../../../../lib/queries/hooks/useReservations';
import type { Room } from '../../../../../lib/queries/hooks/useRooms';

export interface MaintenanceReservationViewProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  room: Room;
  formatDates: () => string;
}

export const MaintenanceReservationView = ({
  isOpen,
  onClose,
  reservation,
  room,
  formatDates,
}: MaintenanceReservationViewProps) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-yellow-600" />
          <span>Room {room.room_number} - Maintenance</span>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Out of Service
          </Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{formatDates()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{reservation.special_requests}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  </Dialog>
);
