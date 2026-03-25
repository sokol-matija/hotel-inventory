import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { DayAvailability } from './types';

interface RoomAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  availabilityData: DayAvailability | null;
}

function getRoomTypeLabel(type: string): string {
  switch (type) {
    case 'standard':
      return 'Standard Rooms';
    case 'premium':
      return 'Premium Rooms';
    case 'suite':
      return 'Suites';
    default:
      return type;
  }
}

function getRoomTypeColor(type: string): string {
  switch (type) {
    case 'standard':
      return 'border-blue-200 bg-blue-50';
    case 'premium':
      return 'border-amber-200 bg-amber-50';
    case 'suite':
      return 'border-purple-200 bg-purple-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
}

export function RoomAvailabilityModal({
  isOpen,
  onClose,
  date,
  availabilityData,
}: RoomAvailabilityModalProps) {
  if (!isOpen || !date || !availabilityData) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="bg-opacity-50 absolute inset-0 bg-black backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      <div className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Room Availability</h2>
              <p className="mt-1 text-sm text-gray-600">{format(date, 'EEEE, MMMM dd, yyyy')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/50">
              ×
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {availabilityData.availableRooms}
              </div>
              <div className="text-sm text-green-600">Available</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {availabilityData.occupiedRooms}
              </div>
              <div className="text-sm text-red-600">Occupied</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {availabilityData.occupancyRate}%
              </div>
              <div className="text-sm text-blue-600">Occupancy</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">By Room Type</h3>
            {Object.entries(availabilityData.roomTypes).map(([type, data]) => (
              <div key={type} className={`rounded-lg border-2 p-4 ${getRoomTypeColor(type)}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">{getRoomTypeLabel(type)}</h4>
                  <Badge variant="outline" className="text-xs">
                    {data.total} Total
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-700">{data.available}</div>
                    <div className="text-xs text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-700">{data.occupied}</div>
                    <div className="text-xs text-gray-600">Occupied</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>Occupancy</span>
                    <span>
                      {data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-300"
                      style={{
                        width: `${data.total > 0 ? (data.occupied / data.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {availabilityData.availableRooms > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Available Rooms</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {availabilityData.availableRoomsList.map((room) => (
                  <div
                    key={room.id}
                    className={`rounded-md border p-2 text-center text-xs font-medium ${
                      room.is_premium
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : room.floor_number >= 4
                          ? 'border-purple-200 bg-purple-50 text-purple-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {room.room_number}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
