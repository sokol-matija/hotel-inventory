import type { Control, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Badge } from '../../../../ui/badge';
import { Star } from 'lucide-react';
import type { FormData } from './formHelpers';

interface GuestPreferencesSectionProps {
  control: Control<FormData>;
  watch: UseFormWatch<FormData>;
  isEditing: boolean;
}

export default function GuestPreferencesSection({
  control,
  watch,
  isEditing,
}: GuestPreferencesSectionProps) {
  const watchedHasPets = watch('has_pets');
  const watchedIsVip = watch('is_vip');

  return (
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
  );
}
