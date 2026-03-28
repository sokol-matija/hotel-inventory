import { Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BookingServices } from './types';

interface BookingServicesSectionProps {
  bookingServices: BookingServices;
  setBookingServices: React.Dispatch<React.SetStateAction<BookingServices>>;
}

export function BookingServicesSection({
  bookingServices,
  setBookingServices,
}: BookingServicesSectionProps) {
  return (
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
  );
}
