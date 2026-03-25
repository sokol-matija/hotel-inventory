import { Baby, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import GuestAutocomplete from '../Guests/GuestAutocomplete';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import type { BookingGuest } from './types';

interface BookingGuestRowProps {
  guest: BookingGuest;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: string | number | boolean) => void;
  onSelectExisting: (guest: Guest, index: number) => void;
}

export function BookingGuestRow({
  guest,
  index,
  onRemove,
  onUpdate,
  onSelectExisting,
}: BookingGuestRowProps) {
  const isFirst = index === 0;

  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {guest.type === 'adult' ? (
            <User className="h-4 w-4 text-blue-600" />
          ) : (
            <Baby className="h-4 w-4 text-green-600" />
          )}
          <span className="font-medium">
            {isFirst ? 'Primary Guest' : `Guest ${index + 1}`}
            {guest.type === 'child' && guest.age && ` (Age ${guest.age})`}
          </span>
          <Badge variant={guest.type === 'adult' ? 'default' : 'secondary'}>
            {guest.type === 'adult' ? 'Adult' : 'Child'}
          </Badge>
          {guest.isExisting && (
            <Badge variant="outline" className="border-green-600 text-green-600">
              Existing Guest
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={guest.type}
            onChange={(e) => onUpdate(guest.id, 'type', e.target.value)}
            className="rounded border px-2 py-1 text-sm"
            disabled={isFirst}
          >
            <option value="adult">Adult</option>
            <option value="child">Child</option>
          </select>
          {!isFirst && (
            <Button type="button" variant="outline" size="sm" onClick={() => onRemove(guest.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!guest.isExisting && guest.type === 'adult' && (
        <div className="mb-3">
          <Label className="text-sm">Or select existing guest</Label>
          <GuestAutocomplete
            onGuestSelect={(selectedGuest) => onSelectExisting(selectedGuest, index)}
            onCreateNew={() => {}}
            selectedGuest={null}
            placeholder="Search existing guests..."
            className="mt-1"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="text-sm">First Name *</Label>
          <Input
            data-testid="guest-first-name"
            placeholder="John"
            value={guest.firstName}
            onChange={(e) => onUpdate(guest.id, 'firstName', e.target.value)}
            className="h-9"
            disabled={guest.isExisting}
          />
        </div>
        <div>
          <Label className="text-sm">Last Name *</Label>
          <Input
            data-testid="guest-last-name"
            placeholder="Doe"
            value={guest.lastName}
            onChange={(e) => onUpdate(guest.id, 'lastName', e.target.value)}
            className="h-9"
            disabled={guest.isExisting}
          />
        </div>

        {guest.type === 'child' && (
          <div>
            <Label className="text-sm">Age *</Label>
            <Input
              type="number"
              placeholder="12"
              min="0"
              max="17"
              value={guest.age || ''}
              onChange={(e) => onUpdate(guest.id, 'age', parseInt(e.target.value) || 0)}
              className="h-9"
            />
          </div>
        )}

        <div>
          <Label className="text-sm">Email</Label>
          <Input
            data-testid="guest-email"
            type="email"
            placeholder="john@example.com"
            value={guest.email || ''}
            onChange={(e) => onUpdate(guest.id, 'email', e.target.value)}
            className="h-9"
            disabled={guest.isExisting}
          />
        </div>
        <div>
          <Label className="text-sm">Phone</Label>
          <Input
            data-testid="guest-phone"
            type="tel"
            placeholder="+385 99 123 4567"
            value={guest.phone || ''}
            onChange={(e) => onUpdate(guest.id, 'phone', e.target.value)}
            className="h-9"
            disabled={guest.isExisting}
          />
        </div>
        <div>
          <Label className="text-sm">Nationality</Label>
          <Input
            placeholder="Croatian"
            value={guest.nationality || ''}
            onChange={(e) => onUpdate(guest.id, 'nationality', e.target.value)}
            className="h-9"
            disabled={guest.isExisting}
          />
        </div>
        {guest.type === 'child' && (
          <div>
            <Label className="text-sm">Date of Birth</Label>
            <Input
              type="date"
              value={guest.dateOfBirth || ''}
              onChange={(e) => onUpdate(guest.id, 'dateOfBirth', e.target.value)}
              className="h-9"
            />
          </div>
        )}
      </div>

      {guest.isExisting && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onUpdate(guest.id, 'isExisting', false)}
          className="mt-2 text-blue-600"
        >
          Switch to manual entry
        </Button>
      )}
    </div>
  );
}
