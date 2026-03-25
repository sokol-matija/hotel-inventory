import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { useUpdatePricingTier } from '../../../lib/queries/hooks/usePricingTiers';
import { PricingTier } from '../../../lib/hotel/types';
import { X } from 'lucide-react';
import {
  pricingTierSchema,
  type PricingTierFormValues,
} from '../../../lib/hotel/schemas/pricingTier';

interface EditPricingTierModalProps {
  isOpen: boolean;
  tier: PricingTier;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPricingTierModal({
  isOpen,
  tier,
  onClose,
  onSuccess,
}: EditPricingTierModalProps) {
  const updatePricingTierMutation = useUpdatePricingTier();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<PricingTierFormValues>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      name: '',
      description: '',
      discountPercentage: 0,
      minimumStay: 1,
      validFrom: '',
      validTo: '',
      isActive: true,
      isDefault: false,
    },
  });

  useEffect(() => {
    if (tier) {
      reset({
        name: tier.name,
        description: tier.description,
        discountPercentage: tier.discountPercentage,
        minimumStay: tier.minimumStayRequirement ?? 1,
        validFrom: tier.validFrom
          ? tier.validFrom.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        validTo: tier.validTo ? tier.validTo.toISOString().split('T')[0] : '',
        isActive: tier.isActive,
        isDefault: tier.isDefault,
      });
    }
  }, [tier, reset]);

  const isActive = watch('isActive');
  const isDefault = watch('isDefault');

  const onSubmit = (values: PricingTierFormValues) => {
    const updates: Partial<PricingTier> = {
      name: values.name.trim(),
      description: values.description.trim(),
      discountPercentage: values.discountPercentage,
      minimumStayRequirement: values.minimumStay,
      validFrom: values.validFrom ? new Date(values.validFrom) : undefined,
      validTo: values.validTo ? new Date(values.validTo) : undefined,
      isActive: values.isActive,
      isDefault: values.isDefault,
    };

    updatePricingTierMutation.mutate(
      { id: tier.id, updates },
      {
        onSuccess: () => onSuccess(),
        onError: (error) => {
          console.error('Failed to update pricing tier:', error);
          setError('root', { message: 'Failed to update pricing tier. Please try again.' });
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pricing Tier Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Corporate Discount, Extended Stay, VIP"
                className={errors.name ? 'border-destructive' : ''}
                {...register('name')}
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this pricing tier"
                rows={2}
                {...register('description')}
              />
            </div>
          </div>

          {/* Discount Percentage */}
          <div className="space-y-2">
            <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
            <Input
              id="discountPercentage"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="e.g., 10 for 10% off"
              className={errors.discountPercentage ? 'border-destructive' : ''}
              {...register('discountPercentage', { valueAsNumber: true })}
            />
            {errors.discountPercentage && (
              <p className="text-destructive text-sm">{errors.discountPercentage.message}</p>
            )}
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
              min="1"
              max="30"
              className={errors.minimumStay ? 'border-destructive' : ''}
              {...register('minimumStay', { valueAsNumber: true })}
            />
            {errors.minimumStay && (
              <p className="text-destructive text-sm">{errors.minimumStay.message}</p>
            )}
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                className={errors.validFrom ? 'border-destructive' : ''}
                {...register('validFrom')}
              />
              {errors.validFrom && (
                <p className="text-destructive text-sm">{errors.validFrom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To</Label>
              <Input
                id="validTo"
                type="date"
                className={errors.validTo ? 'border-destructive' : ''}
                {...register('validTo')}
              />
              {errors.validTo && (
                <p className="text-destructive text-sm">{errors.validTo.message}</p>
              )}
            </div>
          </div>

          {/* Status Switches */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={isDefault}
                onCheckedChange={(checked) => setValue('isDefault', checked)}
                disabled={tier.isDefault && isDefault}
              />
              <Label>Set as Default Tier</Label>
            </div>
          </div>

          {/* Root Error */}
          {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

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
