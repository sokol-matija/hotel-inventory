import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
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

// ─── Zod schema ───────────────────────────────────────────────────────────────

const guestFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Please enter a valid email address',
    }),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  preferred_language: z.string().optional(),
  has_pets: z.boolean(),
  is_vip: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof guestFormSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Default value helpers ────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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

  const form = useForm<FormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: guest ? guestToForm(guest) : emptyForm(initialData),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const [isEditing, setIsEditing] = React.useState(mode === 'edit' || mode === 'create');

  // Re-initialize form when guest/open changes.
  // NOTE: To fully reset this component when the guest changes, prefer mounting it
  // with a stable key: <GuestProfileModal key={guest?.id ?? 'new'} ... />
  useEffect(() => {
    reset(guest ? guestToForm(guest) : emptyForm(initialData));
    setIsEditing(mode === 'edit' || mode === 'create');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest?.id, isOpen]);

  const watchedIsVip = watch('is_vip');
  const watchedHasPets = watch('has_pets');

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
  };

  const onSubmit = async (data: FormData) => {
    try {
      const insertPayload: TablesInsert<'guests'> = {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email || null,
        phone: data.phone || null,
        nationality: data.nationality || null,
        preferred_language: data.preferred_language || null,
        has_pets: data.has_pets,
        is_vip: data.is_vip,
        notes: data.notes || null,
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
          ...data,
          email: data.email ?? null,
          phone: data.phone ?? null,
          nationality: data.nationality ?? null,
          preferred_language: data.preferred_language ?? null,
          notes: data.notes ?? null,
          display_name: `${data.first_name} ${data.last_name}`.trim(),
          full_name: `${data.first_name} ${data.last_name}`.trim(),
        });
      }

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Failed to save guest:', error);
    }
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
                  <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                    <Save className="mr-1 h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'create'
              ? 'Form to create a new guest profile'
              : isEditing
                ? 'Form to edit guest information'
                : 'View guest profile details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Basic Information</span>
                  {watchedIsVip && (
                    <Badge variant="secondary" className="ml-2">
                      <Star className="mr-1 h-3 w-3" />
                      VIP
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* First Name */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-first-name">First Name *</Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="guest-first-name"
                          type="text"
                          placeholder="Enter first name"
                          {...register('first_name')}
                        />
                        {errors.first_name && (
                          <p className="text-destructive text-sm">{errors.first_name.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="p-2 text-gray-900">{watch('first_name')}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-last-name">Last Name *</Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="guest-last-name"
                          type="text"
                          placeholder="Enter last name"
                          {...register('last_name')}
                        />
                        {errors.last_name && (
                          <p className="text-destructive text-sm">{errors.last_name.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="p-2 text-gray-900">{watch('last_name')}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-email">Email Address</Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="guest-email"
                          type="email"
                          placeholder="guest@example.com"
                          {...register('email')}
                        />
                        {errors.email && (
                          <p className="text-destructive text-sm">{errors.email.message}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center space-x-2 p-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{watch('email')}</span>
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-phone">Phone Number</Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="guest-phone"
                          type="tel"
                          placeholder="+49-30-12345678"
                          {...register('phone')}
                        />
                        {errors.phone && (
                          <p className="text-destructive text-sm">{errors.phone.message}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center space-x-2 p-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{formatPhoneNumber(watch('phone') || '')}</span>
                      </div>
                    )}
                  </div>

                  {/* Nationality */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-nationality">Nationality</Label>
                    {isEditing ? (
                      <>
                        <Controller
                          name="nationality"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id="guest-nationality">
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent>
                                {NATIONALITIES.map((nationality) => (
                                  <SelectItem key={nationality} value={nationality}>
                                    {nationality}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.nationality && (
                          <p className="text-destructive text-sm">{errors.nationality.message}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center space-x-2 p-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{watch('nationality')}</span>
                      </div>
                    )}
                  </div>

                  {/* Preferred Language */}
                  <div className="space-y-1">
                    <Label htmlFor="guest-preferred-language">Preferred Language</Label>
                    {isEditing ? (
                      <>
                        <Controller
                          name="preferred_language"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id="guest-preferred-language">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                {LANGUAGES.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.preferred_language && (
                          <p className="text-destructive text-sm">
                            {errors.preferred_language.message}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="p-2 text-gray-700">
                        {LANGUAGES.find((l) => l.code === watch('preferred_language'))?.name ||
                          watch('preferred_language')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Special Preferences */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <Controller
                        name="has_pets"
                        control={control}
                        render={({ field }) => (
                          <label className="flex cursor-pointer items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Travels with pets</span>
                          </label>
                        )}
                      />
                    ) : (
                      watchedHasPets && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>🐕</span>
                          <span>Travels with pets</span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <Controller
                        name="is_vip"
                        control={control}
                        render={({ field }) => (
                          <label className="flex cursor-pointer items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>VIP Status</span>
                          </label>
                        )}
                      />
                    ) : (
                      watchedIsVip && (
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
                  <div className="space-y-1">
                    <Label htmlFor="guest-notes">Notes</Label>
                    <Textarea
                      id="guest-notes"
                      rows={3}
                      placeholder="Internal notes about this guest"
                      {...register('notes')}
                    />
                    {errors.notes && (
                      <p className="text-destructive text-sm">{errors.notes.message}</p>
                    )}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
