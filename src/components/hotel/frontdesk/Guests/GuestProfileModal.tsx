import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Save,
  X,
  Edit,
  Star,
  Baby,
} from 'lucide-react';
import { Guest } from '../../../../lib/queries/hooks/useGuests';
import { useCreateGuest, useUpdateGuest } from '../../../../lib/queries/hooks/useGuests';
import type { TablesInsert } from '@/lib/supabase';

interface GuestProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest?: Guest | null;
  initialData?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  mode: 'view' | 'edit' | 'create';
  onSave?: (guest: Guest) => void;
}

const NATIONALITIES = [
  'German',
  'Italian',
  'Austrian',
  'Croatian',
  'French',
  'Swiss',
  'Dutch',
  'Belgian',
  'Czech',
  'Slovenian',
  'Hungarian',
  'Polish',
  'British',
  'Spanish',
  'Other',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'fr', name: 'French' },
  { code: 'hr', name: 'Croatian' },
  { code: 'other', name: 'Other' },
];

type FormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality: string;
  preferred_language: string;
  has_pets: boolean;
  is_vip: boolean;
  notes: string;
};

function guestToForm(g: Guest): FormData {
  return {
    first_name: g.first_name ?? '',
    last_name: g.last_name ?? '',
    email: g.email ?? '',
    phone: g.phone ?? '',
    nationality: g.nationality ?? 'German',
    preferred_language: g.preferred_language ?? 'en',
    has_pets: g.has_pets ?? false,
    is_vip: g.is_vip ?? false,
    notes: g.notes ?? '',
  };
}

function emptyForm(initialData?: GuestProfileModalProps['initialData']): FormData {
  const [first, ...rest] = (initialData?.fullName ?? '').split(' ');
  return {
    first_name: initialData?.firstName ?? first ?? '',
    last_name: initialData?.lastName ?? rest.join(' ') ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    nationality: 'German',
    preferred_language: 'de',
    has_pets: false,
    is_vip: false,
    notes: '',
  };
}

export default function GuestProfileModal({
  isOpen,
  onClose,
  guest,
  initialData,
  mode,
  onSave,
}: GuestProfileModalProps) {
  const createGuestMutation = useCreateGuest();
  const updateGuestMutation = useUpdateGuest();
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(() =>
    guest ? guestToForm(guest) : emptyForm(initialData)
  );

  // Re-initialize form when guest/open changes
  useEffect(() => {
    if (guest) {
      setFormData(guestToForm(guest));
    } else {
      setFormData(emptyForm(initialData));
    }
    setIsEditing(mode === 'edit' || mode === 'create');
    // NOTE: To fully reset this component when the guest changes, prefer mounting it
    // with a stable key: <GuestProfileModal key={guest?.id ?? 'new'} ... />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest?.id, isOpen]);

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.first_name || !formData.last_name) {
        alert('Please fill in first and last name');
        return;
      }

      const insertPayload: TablesInsert<'guests'> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        nationality: formData.nationality || null,
        preferred_language: formData.preferred_language || null,
        has_pets: formData.has_pets,
        is_vip: formData.is_vip,
        notes: formData.notes || null,
      };

      if (mode === 'create') {
        await createGuestMutation.mutateAsync(insertPayload);
      } else if (guest) {
        await updateGuestMutation.mutateAsync({ id: guest.id, updates: insertPayload });
      }

      // Build a minimal Guest-shaped object for the onSave callback
      if (onSave && guest) {
        onSave({
          ...guest,
          ...formData,
          display_name: `${formData.first_name} ${formData.last_name}`.trim(),
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        });
      }

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Failed to save guest:', error);
      alert('Failed to save guest profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" />
              <span>
                {mode === 'create'
                  ? 'Create New Guest'
                  : isEditing
                    ? 'Edit Guest Profile'
                    : 'Guest Profile'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {mode !== 'create' && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      if (mode === 'create') onClose();
                    }}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-1 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
                {formData.is_vip && (
                  <Badge variant="secondary" className="ml-2">
                    <Star className="mr-1 h-3 w-3" />
                    VIP
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="guest-first-name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    First Name *
                  </label>
                  {isEditing ? (
                    <input
                      id="guest-first-name"
                      type="text"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="p-2 text-gray-900">{formData.first_name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="guest-last-name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Last Name *
                  </label>
                  {isEditing ? (
                    <input
                      id="guest-last-name"
                      type="text"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="p-2 text-gray-900">{formData.last_name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="guest-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      id="guest-email"
                      type="email"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="guest@example.com"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="guest-phone"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      id="guest-phone"
                      type="tel"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+49-30-12345678"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{formatPhoneNumber(formData.phone || '')}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="guest-nationality"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nationality
                  </label>
                  {isEditing ? (
                    <select
                      id="guest-nationality"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                    >
                      {NATIONALITIES.map((nationality) => (
                        <option key={nationality} value={nationality}>
                          {nationality}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{formData.nationality}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="guest-preferred-language"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Preferred Language
                  </label>
                  {isEditing ? (
                    <select
                      id="guest-preferred-language"
                      className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                      value={formData.preferred_language}
                      onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="p-2 text-gray-700">
                      {LANGUAGES.find((l) => l.code === formData.preferred_language)?.name ||
                        formData.preferred_language}
                    </p>
                  )}
                </div>
              </div>

              {/* Special Preferences */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <label className="flex cursor-pointer items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.has_pets}
                        onChange={(e) => handleInputChange('has_pets', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Travels with pets</span>
                    </label>
                  ) : (
                    formData.has_pets && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>🐕</span>
                        <span>Travels with pets</span>
                      </div>
                    )
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <label className="flex cursor-pointer items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_vip}
                        onChange={(e) => handleInputChange('is_vip', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>VIP Status</span>
                    </label>
                  ) : (
                    formData.is_vip && (
                      <Badge variant="secondary">
                        <Star className="mr-1 h-3 w-3" />
                        VIP Guest
                      </Badge>
                    )
                  )}
                </div>
              </div>

              {/* Notes */}
              {isEditing && (
                <div>
                  <label
                    htmlFor="guest-notes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Notes
                  </label>
                  <textarea
                    id="guest-notes"
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Internal notes about this guest"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Children Information — note: guest_children is a separate table, not loaded here */}
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

          {/* Stay History */}
          {!isEditing && guest && (
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
                      Member since{' '}
                      {guest.created_at ? new Date(guest.created_at).getFullYear() : 'N/A'}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
