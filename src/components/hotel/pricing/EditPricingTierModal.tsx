import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { useUpdatePricingTier } from '../../../lib/queries/hooks/usePricingTiers';
import { PricingTier } from '../../../lib/hotel/types';
import { X } from 'lucide-react';

interface EditPricingTierModalProps {
  isOpen: boolean;
  tier: PricingTier;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  discountPercentage: number;
  minimumStay: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  isDefault: boolean;
}

export default function EditPricingTierModal({
  isOpen,
  tier,
  onClose,
  onSuccess,
}: EditPricingTierModalProps) {
  const updatePricingTierMutation = useUpdatePricingTier();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    discountPercentage: 0,
    minimumStay: 1,
    validFrom: '',
    validTo: '',
    isActive: true,
    isDefault: false,
  });

  // Initialize form data when tier changes
  useEffect(() => {
    if (tier) {
      setFormData({
        name: tier.name,
        description: tier.description,
        discountPercentage: tier.discountPercentage,
        minimumStay: tier.minimumStayRequirement || 1,
        validFrom: tier.validFrom
          ? tier.validFrom.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        validTo: tier.validTo ? tier.validTo.toISOString().split('T')[0] : '',
        isActive: tier.isActive,
        isDefault: tier.isDefault,
      });
    }
  }, [tier]);

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updatePricingTierMutation.isPending) return;

    if (!formData.name.trim()) {
      alert('Please enter a pricing tier name.');
      return;
    }

    const updates: Partial<PricingTier> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      discountPercentage: formData.discountPercentage,
      minimumStayRequirement: formData.minimumStay,
      validFrom: formData.validFrom ? new Date(formData.validFrom) : undefined,
      validTo: formData.validTo ? new Date(formData.validTo) : undefined,
      isActive: formData.isActive,
      isDefault: formData.isDefault,
    };

    updatePricingTierMutation.mutate(
      { id: tier.id, updates },
      {
        onSuccess: () => onSuccess(),
        onError: (error) => {
          console.error('Failed to update pricing tier:', error);
          alert('Failed to update pricing tier. Please try again.');
        },
      }
    );
  };

  if (!isOpen || !tier) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Edit Pricing Tier</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Basic Information */}
          <div className="space-y-4">
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this pricing tier"
                rows={2}
              />
            </div>
          </div>

          {/* Discount Percentage */}
          <div className="space-y-2">
            <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
            <Input
              id="discountPercentage"
              type="number"
              value={formData.discountPercentage}
              onChange={(e) =>
                handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)
              }
              min="0"
              max="100"
              step="1"
              placeholder="e.g., 10 for 10% off"
            />
            <p className="text-xs text-gray-500">
              Applied to all accommodation charges for reservations using this tier.
            </p>
          </div>

          {/* Stay Requirements */}
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

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleInputChange('validFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To</Label>
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
                disabled={tier.isDefault && formData.isDefault}
              />
              <Label>Set as Default Tier</Label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updatePricingTierMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updatePricingTierMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updatePricingTierMutation.isPending ? 'Updating...' : 'Update Pricing Tier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
