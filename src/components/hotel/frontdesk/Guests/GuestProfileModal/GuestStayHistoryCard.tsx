import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';
import { Calendar, Users, Star } from 'lucide-react';
import type { Guest } from '../../../../../lib/queries/hooks/useGuests';

interface GuestStayHistoryCardProps {
  guest: Guest;
}

export default function GuestStayHistoryCard({ guest }: GuestStayHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Stay History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>
              Member since {guest.created_at ? new Date(guest.created_at).getFullYear() : 'N/A'}
            </span>
          </div>
          {guest.is_vip && (
            <Badge variant="secondary">
              <Star className="mr-1 h-3 w-3" />
              VIP Guest
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
