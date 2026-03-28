import { Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Room } from '@/lib/queries/hooks/useRooms';

interface RoomSelectionSectionProps {
  isUnallocated: boolean;
  setIsUnallocated: (v: boolean) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (r: Room | null) => void;
  availableRooms: Room[];
}

export function RoomSelectionSection({
  isUnallocated,
  setIsUnallocated,
  selectedRoom,
  setSelectedRoom,
  availableRooms,
}: RoomSelectionSectionProps) {
  return (
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
            <p className="mt-1 text-xs text-gray-500">Place in virtual queue - assign room later</p>
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
                    Room {r.room_number} - {r.room_types?.code ?? ''} (Floor {r.floor_number}, Max:{' '}
                    {r.max_occupancy})
                  </option>
                ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
