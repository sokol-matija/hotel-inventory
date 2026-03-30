import type React from 'react';
import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import { User, Phone, Mail, MapPin, Star } from 'lucide-react';
import { NATIONALITIES, LANGUAGES } from './constants';
import type { FormData } from './formHelpers';

interface GuestBasicInfoCardProps {
  register: UseFormRegister<FormData>;
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  watch: UseFormWatch<FormData>;
  isEditing: boolean;
  children?: React.ReactNode;
}

function formatPhoneNumber(phone: string) {
  return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
}

export default function GuestBasicInfoCard({
  register,
  control,
  errors,
  watch,
  isEditing,
  children,
}: GuestBasicInfoCardProps) {
  const watchedIsVip = watch('is_vip');

  return (
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
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
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
                {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
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
                  <p className="text-destructive text-sm">{errors.preferred_language.message}</p>
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

        {children}
      </CardContent>
    </Card>
  );
}
