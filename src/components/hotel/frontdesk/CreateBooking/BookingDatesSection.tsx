import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingDatesSectionProps {
  checkInDate: Date;
  setCheckInDate: (d: Date) => void;
  checkOutDate: Date;
  setCheckOutDate: (d: Date) => void;
  numberOfNights: number;
}

export function BookingDatesSection({
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  numberOfNights,
}: BookingDatesSectionProps) {
  return (
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
  );
}
