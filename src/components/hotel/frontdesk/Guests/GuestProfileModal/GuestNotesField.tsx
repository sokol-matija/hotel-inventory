import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import type { FormData } from './formHelpers';

interface GuestNotesFieldProps {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  isEditing: boolean;
}

export default function GuestNotesField({ register, errors, isEditing }: GuestNotesFieldProps) {
  if (!isEditing) return null;

  return (
    <div className="space-y-1">
      <Label htmlFor="guest-notes">Notes</Label>
      <Textarea
        id="guest-notes"
        rows={3}
        placeholder="Internal notes about this guest"
        {...register('notes')}
      />
      {errors.notes && <p className="text-destructive text-sm">{errors.notes.message}</p>}
    </div>
  );
}
