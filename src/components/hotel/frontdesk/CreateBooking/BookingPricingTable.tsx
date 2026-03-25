import { Receipt, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChargeType, ReservationCharge } from '@/lib/hotel/types';
import type { Room } from '@/lib/queries/hooks/useRooms';

const CHARGE_SECTION_LABELS: Partial<Record<ChargeType, string>> = {
  accommodation: 'Accommodation',
  tourism_tax: 'Taxes',
  parking: 'Supplements',
  pet_fee: 'Supplements',
  short_stay_supplement: 'Supplements',
  towel_rental: 'Supplements',
  discount: 'Discounts',
  room_service: 'Room Service',
  additional: 'Additional',
};

const SECTION_ORDER: ChargeType[] = [
  'accommodation',
  'tourism_tax',
  'parking',
  'pet_fee',
  'short_stay_supplement',
  'towel_rental',
  'discount',
  'room_service',
  'additional',
];

interface BookingPricingTableProps {
  previewCharges: ReservationCharge[];
  chargesLoading: boolean;
  chargeTotal: number;
  chargesByType: Record<string, ReservationCharge[]>;
  isUnallocated: boolean;
  selectedRoom: Room | null;
}

export function BookingPricingTable({
  previewCharges,
  chargesLoading,
  chargeTotal,
  chargesByType,
  isUnallocated,
  selectedRoom,
}: BookingPricingTableProps) {
  // Reset on every render — intentional: tracks which section headers have been shown
  const renderedSections = new Set<string>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Receipt className="mr-2 h-4 w-4" />
          Pricing Summary
          {chargesLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-gray-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewCharges.length === 0 && !chargesLoading ? (
          <p className="text-sm text-gray-500 italic">
            {isUnallocated || !selectedRoom
              ? 'Select a room to see pricing.'
              : 'Enter guest details to generate pricing.'}
          </p>
        ) : (
          <div className="space-y-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-1 font-medium">Description</th>
                  <th className="pb-1 text-right font-medium">Qty</th>
                  <th className="pb-1 text-right font-medium">Unit Price</th>
                  <th className="pb-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {SECTION_ORDER.map((chargeType) => {
                  const charges = chargesByType[chargeType];
                  if (!charges || charges.length === 0) return null;

                  const sectionLabel = CHARGE_SECTION_LABELS[chargeType] || chargeType;
                  const showHeader = !renderedSections.has(sectionLabel);
                  if (showHeader) renderedSections.add(sectionLabel);

                  return (
                    <>
                      {showHeader && (
                        <tr key={`header-${sectionLabel}`}>
                          <td
                            colSpan={4}
                            className="pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase"
                          >
                            {sectionLabel}
                          </td>
                        </tr>
                      )}
                      {charges.map((charge, idx) => (
                        <tr
                          key={`${chargeType}-${idx}`}
                          className={charge.total < 0 ? 'text-green-700' : ''}
                        >
                          <td className="py-0.5 pr-2">{charge.description}</td>
                          <td className="py-0.5 text-right">{charge.quantity}</td>
                          <td className="py-0.5 text-right">
                            {charge.unitPrice < 0 ? '-' : ''}€
                            {Math.abs(charge.unitPrice).toFixed(2)}
                          </td>
                          <td className="py-0.5 text-right">
                            {charge.total < 0 ? '-' : ''}€{Math.abs(charge.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 text-lg font-bold">
                  <td colSpan={3} className="pt-2">
                    Total
                  </td>
                  <td className="pt-2 text-right">€{chargeTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
