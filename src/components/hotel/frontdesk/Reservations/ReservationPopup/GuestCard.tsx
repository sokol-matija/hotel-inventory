import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Button } from '../../../../ui/button';
import { User, Phone, Mail, MapPin, Users, Send, X } from 'lucide-react';
import type { Reservation } from '../../../../../lib/queries/hooks/useReservations';
import type { Guest } from '../../../../../lib/queries/hooks/useGuests';

export interface GuestCardProps {
  guest: Guest;
  reservation: Reservation;
  reservationStatusCode: string;
  isSendingEmail: boolean;
  onSendWelcome: () => void;
  onSendReminder: () => void;
}

export const GuestCard = ({
  guest,
  reservation,
  reservationStatusCode,
  isSendingEmail,
  onSendWelcome,
  onSendReminder,
}: GuestCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <User className="h-5 w-5" />
        <span>Guest Information</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{guest.display_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.phone}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.nationality}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {reservation.adults} Adults
              {(reservation.children_count ?? 0) > 0 && `, ${reservation.children_count} Children`}
            </span>
          </div>
        </div>
      </div>
      {(reservationStatusCode === 'confirmed' || reservationStatusCode === 'checked-in') && (
        <div className="border-t pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={onSendWelcome}
              disabled={isSendingEmail || !guest.email}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isSendingEmail ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Welcome Email
            </Button>
            <Button
              onClick={onSendReminder}
              disabled={isSendingEmail || !guest.email}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {isSendingEmail ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-orange-600" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Reminder
            </Button>
          </div>
          {!guest.email && (
            <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <X className="h-3.5 w-3.5" /> No email address on file
            </p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);
