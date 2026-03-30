import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { User, Save, X, Edit } from 'lucide-react';
import type { Guest } from '../../../../../lib/queries/hooks/useGuests';
import { useGuestProfileForm } from './useGuestProfileForm';
import type { InitialData } from './formHelpers';
import GuestBasicInfoCard from './GuestBasicInfoCard';
import GuestPreferencesSection from './GuestPreferencesSection';
import GuestNotesField from './GuestNotesField';
import GuestChildrenCard from './GuestChildrenCard';
import GuestStayHistoryCard from './GuestStayHistoryCard';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GuestProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest?: Guest | null;
  initialData?: InitialData;
  mode: 'view' | 'edit' | 'create';
  onSave?: (guest: Guest) => void;
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
  const {
    register,
    control,
    handleSubmit,
    watch,
    errors,
    isSubmitting,
    isEditing,
    setIsEditing,
    onSubmit,
  } = useGuestProfileForm({ guest, initialData, mode, onSave, onClose, isOpen });

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
            <GuestBasicInfoCard
              register={register}
              control={control}
              errors={errors}
              watch={watch}
              isEditing={isEditing}
            >
              <GuestPreferencesSection control={control} watch={watch} isEditing={isEditing} />
              <GuestNotesField register={register} errors={errors} isEditing={isEditing} />
            </GuestBasicInfoCard>

            <GuestChildrenCard />

            {!isEditing && guest && <GuestStayHistoryCard guest={guest} />}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
