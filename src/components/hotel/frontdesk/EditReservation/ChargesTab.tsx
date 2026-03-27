import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useReservationCharges } from '@/lib/queries/hooks/useReservationCharges';
import EditChargesPanel from '@/components/hotel/frontdesk/Reservations/EditChargesPanel';

const formatCurrency = (amount: number) => `\u20AC${amount.toFixed(2)}`;

interface ChargesTabProps {
  reservationId: number;
}

export function ChargesTab({ reservationId }: ChargesTabProps) {
  const { t } = useTranslation();
  const { data: charges = [] } = useReservationCharges(reservationId);

  const total = useMemo(() => charges.reduce((sum, c) => sum + c.total, 0), [charges]);

  const chargeCount = charges.length;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
        <div className="flex items-center gap-2">
          <Receipt className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">{t('editRes.totalCharges', 'Total Charges')}</span>
          <Badge variant="secondary" className="text-xs">
            {chargeCount} {t('editRes.items', 'items')}
          </Badge>
        </div>
        <span className="text-lg font-semibold">{formatCurrency(total)}</span>
      </div>

      {/* Charges panel */}
      <EditChargesPanel
        reservationId={reservationId}
        onClose={() => {
          /* no-op inside sheet */
        }}
      />
    </div>
  );
}
