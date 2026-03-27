import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, Save, Plus, RefreshCw, X } from 'lucide-react';
import {
  useReservationCharges,
  useCreateCharge,
  useUpdateCharge,
  useDeleteCharge,
} from '@/lib/queries/hooks/useReservationCharges';
import { ChargeType, ReservationCharge } from '@/lib/hotel/types';
import { cn } from '@/lib/utils';

const CHARGE_TYPES: ChargeType[] = [
  'accommodation',
  'tourism_tax',
  'parking',
  'pet_fee',
  'room_service',
  'additional',
  'discount',
];

const CHARGE_TYPE_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  tourism_tax: 'Tourism Tax',
  parking: 'Parking',
  pet_fee: 'Pet Fee',
  short_stay_supplement: 'Short Stay Supplement',
  room_service: 'Room Service',
  towel_rental: 'Towel Rental',
  additional: 'Additional',
  discount: 'Discount',
};

const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

interface RowDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface EditChargesPanelProps {
  reservationId: number;
  onClose: () => void;
  onRecalculate?: () => void;
}

interface EditableRowProps {
  charge: ReservationCharge;
  reservationId: number;
}

function EditableRow({ charge, reservationId }: EditableRowProps) {
  const [draft, setDraft] = useState<RowDraft>({
    description: charge.description,
    quantity: String(charge.quantity),
    unitPrice: String(charge.unitPrice),
  });
  const [isDirty, setIsDirty] = useState(false);

  const updateCharge = useUpdateCharge();
  const deleteCharge = useDeleteCharge();

  const qty = parseFloat(draft.quantity) || 0;
  const unitPrice = parseFloat(draft.unitPrice) || 0;
  const computedTotal = qty * unitPrice;

  const handleChange = (field: keyof RowDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateCharge.mutate({
      id: charge.id,
      updates: {
        description: draft.description,
        quantity: qty,
        unit_price: unitPrice,
        total: computedTotal,
      },
    });
    setIsDirty(false);
  };

  const handleDelete = () => {
    deleteCharge.mutate({ id: charge.id, reservationId });
  };

  const isSaving = updateCharge.isPending;
  const isDeleting = deleteCharge.isPending;

  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-2">
        <Input
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="h-8 min-w-[120px] text-sm"
          placeholder="Description"
        />
      </td>
      <td className="w-16 py-1.5 pr-2">
        <Input
          type="number"
          value={draft.quantity}
          onChange={(e) => handleChange('quantity', e.target.value)}
          className="h-8 w-16 [appearance:textfield] px-1.5 text-center text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min="0"
          step="1"
        />
      </td>
      <td className="w-24 py-1.5 pr-2">
        <Input
          type="number"
          value={draft.unitPrice}
          onChange={(e) => handleChange('unitPrice', e.target.value)}
          className="h-8 w-24 [appearance:textfield] px-1.5 text-right text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min="0"
          step="0.01"
        />
      </td>
      <td className="w-24 py-1.5 pr-2 text-right text-sm font-medium whitespace-nowrap tabular-nums">
        {formatCurrency(computedTotal)}
      </td>
      <td className="w-20 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', isDirty && 'text-blue-600 hover:text-blue-700')}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title="Save changes"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete charge"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

interface NewChargeFormState {
  chargeType: ChargeType;
  description: string;
  quantity: string;
  unitPrice: string;
}

const DEFAULT_NEW_CHARGE: NewChargeFormState = {
  chargeType: 'additional',
  description: '',
  quantity: '1',
  unitPrice: '0',
};

export default function EditChargesPanel({
  reservationId,
  onClose,
  onRecalculate,
}: EditChargesPanelProps) {
  const { data: charges = [], isLoading } = useReservationCharges(reservationId);
  const createCharge = useCreateCharge();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharge, setNewCharge] = useState<NewChargeFormState>(DEFAULT_NEW_CHARGE);
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);

  const grandTotal = charges.reduce((sum, c) => sum + c.total, 0);

  const newQty = parseFloat(newCharge.quantity) || 0;
  const newUnitPrice = parseFloat(newCharge.unitPrice) || 0;
  const newTotal = newQty * newUnitPrice;

  const handleAddCharge = () => {
    if (!newCharge.description.trim()) return;
    createCharge.mutate(
      {
        reservation_id: reservationId,
        charge_type: newCharge.chargeType,
        description: newCharge.description.trim(),
        quantity: newQty,
        unit_price: newUnitPrice,
        total: newTotal,
        vat_rate: newCharge.chargeType === 'accommodation' ? 0.13 : 0,
        sort_order: charges.length,
      },
      {
        onSuccess: () => {
          setNewCharge(DEFAULT_NEW_CHARGE);
          setShowAddForm(false);
        },
      }
    );
  };

  const handleRecalculate = () => {
    setShowRecalcConfirm(false);
    onRecalculate?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Edit Charges</h3>
        <div className="flex items-center gap-2">
          {onRecalculate && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setShowRecalcConfirm(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recalculate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
            title="Close editor"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Recalculate confirmation */}
      {showRecalcConfirm && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-2 font-medium text-amber-800">
            This will replace all charges with fresh calculations. Continue?
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleRecalculate}>
              Yes, recalculate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowRecalcConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Charges table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading charges...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Description</th>
                <th className="w-16 pb-2 text-center font-medium">Qty</th>
                <th className="w-24 pb-2 text-right font-medium">Unit Price</th>
                <th className="w-24 pb-2 text-right font-medium">Total</th>
                <th className="w-18 pb-2" />
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-gray-400">
                    No charges yet. Add one below.
                  </td>
                </tr>
              ) : (
                charges.map((charge) => (
                  <EditableRow key={charge.id} charge={charge} reservationId={reservationId} />
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="pt-3 pr-2 text-right text-sm font-semibold">
                  Grand Total
                </td>
                <td className="pt-3 pr-2 text-right text-base font-bold tabular-nums">
                  {formatCurrency(grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add charge section */}
      {showAddForm ? (
        <div className="space-y-3 rounded-md border bg-gray-50 p-3">
          <p className="text-xs font-medium tracking-wide text-gray-600 uppercase">New Charge</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Select
                value={newCharge.chargeType}
                onValueChange={(v) =>
                  setNewCharge((prev) => ({ ...prev, chargeType: v as ChargeType }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Charge type" />
                </SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CHARGE_TYPE_LABELS[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={newCharge.description}
                onChange={(e) => setNewCharge((prev) => ({ ...prev, description: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <Input
              type="number"
              placeholder="Qty"
              value={newCharge.quantity}
              onChange={(e) => setNewCharge((prev) => ({ ...prev, quantity: e.target.value }))}
              className="h-8 text-sm"
              min="0"
              step="1"
            />
            <Input
              type="number"
              placeholder="Unit price"
              value={newCharge.unitPrice}
              onChange={(e) => setNewCharge((prev) => ({ ...prev, unitPrice: e.target.value }))}
              className="h-8 text-sm"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Total: <strong>{formatCurrency(newTotal)}</strong>
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddCharge}
                disabled={createCharge.isPending || !newCharge.description.trim()}
              >
                {createCharge.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-3.5 w-3.5" />
                )}
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCharge(DEFAULT_NEW_CHARGE);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full gap-1.5 text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Charge
        </Button>
      )}
    </div>
  );
}
