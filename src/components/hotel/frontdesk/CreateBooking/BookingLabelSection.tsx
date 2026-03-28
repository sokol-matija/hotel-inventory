import { Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import LabelAutocomplete from '../../shared/LabelAutocomplete';

interface BookingLabelSectionProps {
  hotelId: string;
  selectedLabelId: string | null;
  setSelectedLabelId: (id: string | null) => void;
}

export function BookingLabelSection({
  hotelId,
  selectedLabelId,
  setSelectedLabelId,
}: BookingLabelSectionProps) {
  return (
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
  );
}
