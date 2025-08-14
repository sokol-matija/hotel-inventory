import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import { PricingTier, RoomType } from '../../../lib/hotel/types';
import { X, Plus, Minus } from 'lucide-react';

interface EditPricingTierModalProps {
  isOpen: boolean;
  tier: PricingTier;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  seasonalRates: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  feeModifiers: {
    tourismTax: number;
    pets: number;
    parking: number;
    shortStay: number;
    additional: number;
  };
  roomTypes: RoomType[];
  minimumStay: number;
  maximumStay: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  isDefault: boolean;
  notes: string;
}

const ROOM_TYPE_OPTIONS: RoomType[] = [
  'big-double', 'big-single', 'double', 'triple', 'single', 
  'family', 'apartment', 'rooftop-apartment'
];

export default function EditPricingTierModal({ isOpen, tier, onClose, onSuccess }: EditPricingTierModalProps) {
  const { updatePricingTier } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    seasonalRates: {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    },
    feeModifiers: {
      tourismTax: 0,
      pets: 0,
      parking: 0,
      shortStay: 0,
      additional: 0,
    },
    roomTypes: [],
    minimumStay: 1,
    maximumStay: 30,
    validFrom: '',
    validTo: '',
    isActive: true,
    isDefault: false,
    notes: ''
  });

  // Initialize form data when tier changes
  useEffect(() => {
    if (tier) {
      setFormData({
        name: tier.name,
        description: tier.description,
        seasonalRates: { ...tier.seasonalRates },
        feeModifiers: { tourismTax: 0, pets: 0, parking: 0, shortStay: 0, additional: 0 },
        roomTypes: [],
        minimumStay: tier.minimumStayRequirement || 1,
        maximumStay: 30,
        validFrom: tier.validFrom ? tier.validFrom.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        validTo: tier.validTo ? tier.validTo.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isActive: tier.isActive,
        isDefault: tier.isDefault,
        notes: tier.notes || ''
      });
    }
  }, [tier]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRateModifierChange = (period: keyof FormData['seasonalRates'], value: number) => {
    setFormData(prev => ({
      ...prev,
      seasonalRates: {
        ...prev.seasonalRates,
        [period]: value
      }
    }));
  };

  const handleFeeModifierChange = (fee: keyof FormData['feeModifiers'], value: number) => {
    setFormData(prev => ({
      ...prev,
      feeModifiers: {
        ...prev.feeModifiers,
        [fee]: value
      }
    }));
  };

  const handleRoomTypeToggle = (roomType: RoomType) => {
    setFormData(prev => ({
      ...prev,
      roomTypes: prev.roomTypes.includes(roomType)
        ? prev.roomTypes.filter(type => type !== roomType)
        : [...prev.roomTypes, roomType]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a pricing tier name.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a description.');
      return;
    }

    if (formData.roomTypes.length === 0) {
      alert('Please select at least one room type.');
      return;
    }

    if (new Date(formData.validFrom) >= new Date(formData.validTo)) {
      alert('Valid to date must be after valid from date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates: Partial<PricingTier> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        seasonalRates: formData.seasonalRates,
        minimumStayRequirement: formData.minimumStay,
        validFrom: new Date(formData.validFrom),
        validTo: new Date(formData.validTo),
        isActive: formData.isActive,
        isDefault: formData.isDefault,
        notes: formData.notes.trim()
      };

      await updatePricingTier(tier.id, updates);
      onSuccess();
    } catch (error) {
      console.error('Failed to update pricing tier:', error);
      alert('Failed to update pricing tier. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !tier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Pricing Tier</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pricing Tier Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Corporate Discount, Extended Stay, VIP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this pricing tier"
              />
            </div>
          </div>

          {/* Rate Modifiers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Seasonal Rate Modifiers (%)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Period A (Winter/Early Spring)</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('A', formData.seasonalRates.A - 5)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={formData.seasonalRates.A}
                    onChange={(e) => handleRateModifierChange('A', parseFloat(e.target.value) || 0)}
                    className="text-center"
                    step="0.1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('A', formData.seasonalRates.A + 5)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Period B (Spring/Late Fall)</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('B', formData.seasonalRates.B - 5)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={formData.seasonalRates.B}
                    onChange={(e) => handleRateModifierChange('B', parseFloat(e.target.value) || 0)}
                    className="text-center"
                    step="0.1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('B', formData.seasonalRates.B + 5)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Period C (Early Summer/Fall)</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('C', formData.seasonalRates.C - 5)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={formData.seasonalRates.C}
                    onChange={(e) => handleRateModifierChange('C', parseFloat(e.target.value) || 0)}
                    className="text-center"
                    step="0.1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('C', formData.seasonalRates.C + 5)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Period D (Peak Summer)</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('D', formData.seasonalRates.D - 5)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={formData.seasonalRates.D}
                    onChange={(e) => handleRateModifierChange('D', parseFloat(e.target.value) || 0)}
                    className="text-center"
                    step="0.1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateModifierChange('D', formData.seasonalRates.D + 5)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Modifiers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Fee Modifiers (€)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tourism Tax Adjustment</Label>
                <Input
                  type="number"
                  value={formData.feeModifiers.tourismTax}
                  onChange={(e) => handleFeeModifierChange('tourismTax', parseFloat(e.target.value) || 0)}
                  step="0.10"
                />
              </div>
              <div className="space-y-2">
                <Label>Pet Fee Adjustment</Label>
                <Input
                  type="number"
                  value={formData.feeModifiers.pets}
                  onChange={(e) => handleFeeModifierChange('pets', parseFloat(e.target.value) || 0)}
                  step="1.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Parking Fee Adjustment</Label>
                <Input
                  type="number"
                  value={formData.feeModifiers.parking}
                  onChange={(e) => handleFeeModifierChange('parking', parseFloat(e.target.value) || 0)}
                  step="1.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Short Stay Supplement (%)</Label>
                <Input
                  type="number"
                  value={formData.feeModifiers.shortStay}
                  onChange={(e) => handleFeeModifierChange('shortStay', parseFloat(e.target.value) || 0)}
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Charges</Label>
                <Input
                  type="number"
                  value={formData.feeModifiers.additional}
                  onChange={(e) => handleFeeModifierChange('additional', parseFloat(e.target.value) || 0)}
                  step="1.00"
                />
              </div>
            </div>
          </div>

          {/* Room Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Applicable Room Types *</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ROOM_TYPE_OPTIONS.map((roomType) => (
                <label key={roomType} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.roomTypes.includes(roomType)}
                    onChange={() => handleRoomTypeToggle(roomType)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{roomType.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stay Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumStay">Minimum Stay (nights)</Label>
              <Input
                id="minimumStay"
                type="number"
                value={formData.minimumStay}
                onChange={(e) => handleInputChange('minimumStay', parseInt(e.target.value) || 1)}
                min="1"
                max="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximumStay">Maximum Stay (nights)</Label>
              <Input
                id="maximumStay"
                type="number"
                value={formData.maximumStay}
                onChange={(e) => handleInputChange('maximumStay', parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleInputChange('validFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To *</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => handleInputChange('validTo', e.target.value)}
              />
            </div>
          </div>

          {/* Status Switches */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) => handleInputChange('isActive', checked)}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked: boolean) => handleInputChange('isDefault', checked)}
                disabled={tier.isDefault && formData.isDefault} // Prevent unchecking if this is the default
              />
              <Label>Set as Default Tier</Label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about this pricing tier..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Pricing Tier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}