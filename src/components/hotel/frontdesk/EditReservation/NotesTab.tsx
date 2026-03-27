import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { EditReservationFormValues } from '@/lib/hotel/schemas/reservation';

interface NotesTabProps {
  form: UseFormReturn<EditReservationFormValues>;
}

export function NotesTab({ form }: NotesTabProps) {
  const { t } = useTranslation();
  const { register } = form;

  return (
    <div className="space-y-5">
      {/* Special requests */}
      <div className="space-y-1.5">
        <Label htmlFor="special_requests">{t('editRes.specialRequests', 'Special Requests')}</Label>
        <Textarea
          id="special_requests"
          rows={4}
          placeholder={t('editRes.specialRequestsPlaceholder', 'Guest requests, preferences...')}
          {...register('special_requests')}
        />
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="internal_notes">{t('editRes.internalNotes', 'Internal Notes')}</Label>
          <Badge variant="outline" className="text-muted-foreground text-[10px]">
            {t('editRes.staffOnly', 'Staff only')}
          </Badge>
        </div>
        <Textarea
          id="internal_notes"
          rows={4}
          placeholder={t('editRes.internalNotesPlaceholder', 'Staff-only notes...')}
          {...register('internal_notes')}
        />
      </div>
    </div>
  );
}
