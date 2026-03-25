import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { X, Building2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateCompany } from '../../../lib/queries/hooks/useCompanies';
import hotelNotification from '../../../lib/notifications';
import { convertToCountryCode } from '../../../lib/hotel/countryCodeUtils';
import { companySchema, type CompanyFormValues } from '../../../lib/hotel/schemas/company';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCompanyModal({ isOpen, onClose }: CreateCompanyModalProps) {
  const createCompanyMutation = useCreateCompany();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      oib: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Croatia',
      contactPerson: '',
      email: '',
      phone: '',
      fax: '',
      pricingTierId: '',
      roomAllocationGuarantee: 0,
      isActive: true,
      notes: '',
    },
  });

  const oibValue = watch('oib');
  const oibTouched = oibValue.length > 0;
  const oibValid = oibTouched && !errors.oib;
  const oibInvalid = oibTouched && !!errors.oib;

  const onSubmit = async (data: CompanyFormValues) => {
    try {
      const companyData: import('../../../lib/supabase').TablesInsert<'companies'> = {
        name: data.name,
        oib: data.oib,
        address: data.address,
        city: data.city,
        postal_code: data.postalCode,
        country: convertToCountryCode(data.country),
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        fax: data.fax || undefined,
        pricing_tier_id: data.pricingTierId ? parseInt(data.pricingTierId) : undefined,
        room_allocation_guarantee: data.roomAllocationGuarantee || undefined,
        is_active: data.isActive,
        notes: data.notes,
      };

      await createCompanyMutation.mutateAsync(companyData);

      hotelNotification.success(
        'Company Created',
        `Company "${data.name}" has been successfully created.`
      );

      reset();
      onClose();
    } catch (error) {
      console.error('Failed to create company:', error);
      hotelNotification.error(
        'Creation Failed',
        'Failed to create company. Please check if the OIB already exists and try again.'
      );
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Create New Company</h2>
              <p className="text-sm text-gray-500">Add a new corporate client for R1 billing</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter company name"
                    className={cn(
                      errors.name && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {errors.name && (
                    <p className="text-destructive mt-1 text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="oib">Croatian OIB (Tax Number) *</Label>
                  <div className="relative">
                    <Input
                      id="oib"
                      {...register('oib')}
                      placeholder="12345678901"
                      maxLength={11}
                      className={cn(
                        oibValid && 'border-green-300 focus-visible:ring-green-500',
                        oibInvalid && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    {oibTouched && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2">
                        {oibValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="text-destructive h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>
                  {oibValid && <p className="mt-1 text-xs text-green-600">Valid Croatian OIB</p>}
                  {errors.oib && (
                    <p className="text-destructive mt-1 text-sm">{errors.oib.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} placeholder="Street address" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} placeholder="City" />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" {...register('postalCode')} placeholder="12345" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    {...register('country')}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="Croatia">🇭🇷 Croatia</option>
                    <option value="Slovenia">🇸🇮 Slovenia</option>
                    <option value="Italy">🇮🇹 Italy</option>
                    <option value="Austria">🇦🇹 Austria</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    {...register('contactPerson')}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="contact@company.com"
                    className={cn(
                      errors.email && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {errors.email && (
                    <p className="text-destructive mt-1 text-sm">{errors.email.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} placeholder="+385 XX XXX XXXX" />
                </div>
                <div>
                  <Label htmlFor="fax">Fax (Optional)</Label>
                  <Input id="fax" {...register('fax')} placeholder="+385 XX XXX XXXX" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="roomAllocationGuarantee">Room Allocation Guarantee</Label>
                  <Input
                    id="roomAllocationGuarantee"
                    type="number"
                    min="0"
                    {...register('roomAllocationGuarantee', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of guaranteed room allocations
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <Label htmlFor="isActive">Active Company</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Additional notes about this company..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end space-x-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
