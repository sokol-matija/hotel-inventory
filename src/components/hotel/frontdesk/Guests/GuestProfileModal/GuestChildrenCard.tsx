import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Baby } from 'lucide-react';

export default function GuestChildrenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Baby className="h-5 w-5" />
          <span>Children</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="py-4 text-center text-gray-500">
          Children are managed separately via the reservation booking form.
        </p>
      </CardContent>
    </Card>
  );
}
