import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { X, Building2, Check, AlertCircle } from 'lucide-react';
import { Company } from '../../../lib/hotel/types';
import { useCreateCompany } from '../../../lib/queries/hooks/useCompanies';
import hotelNotification from '../../../lib/notifications';
import { convertToCountryCode } from '../../../lib/hotel/countryCodeUtils';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CompanyFormData {
  name: string;
  oib: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  fax: string;
  pricingTierId: string;
  roomAllocationGuarantee: number;
  isActive: boolean;
  notes: string;
}

const initialFormData: CompanyFormData = {
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
};

const validateOIB = (oib: string) => /^\d{11}$/.test(oib);

export default function CreateCompanyModal({ isOpen, onClose }: CreateCompanyModalProps) {
  const createCompanyMutation = useCreateCompany();
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [oibValidation, setOibValidation] = useState<{ isValid: boolean; message: string } | null>(
    null
  );

  // Validate OIB in real-time
  const handleOibChange = (oib: string) => {
    setFormData((prev) => ({ ...prev, oib }));

    if (oib.length === 0) {
      setOibValidation(null);
      return;
    }

    if (oib.length !== 11) {
      setOibValidation({ isValid: false, message: 'OIB must be exactly 11 digits' });
      return;
    }

    if (!/^\d{11}$/.test(oib)) {
      setOibValidation({ isValid: false, message: 'OIB must contain only digits' });
      return;
    }

    const isValid = validateOIB(oib);
    setOibValidation({
      isValid,
      message: isValid ? 'Valid Croatian OIB' : 'Invalid Croatian OIB checksum',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.oib.trim()) {
      hotelNotification.error('Validation Error', 'Company name and OIB are required.');
      return;
    }

    if (!oibValidation?.isValid) {
      hotelNotification.error('Invalid OIB', 'Please enter a valid Croatian OIB number.');
      return;
    }

    const companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      oib: formData.oib,
      address: {
        street: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: convertToCountryCode(formData.country),
      },
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      fax: formData.fax || undefined,
      pricingTierId: formData.pricingTierId || undefined,
      roomAllocationGuarantee: formData.roomAllocationGuarantee || undefined,
      isActive: formData.isActive,
      notes: formData.notes,
    };

    createCompanyMutation.mutate(companyData, {
      onSuccess: () => {
        hotelNotification.success(
          'Company Created',
          `Company "${formData.name}" has been successfully created.`
        );
        setFormData(initialFormData);
        setOibValidation(null);
        onClose();
      },
      onError: (error) => {
        console.error('Failed to create company:', error);
        hotelNotification.error(
          'Creation Failed',
          'Failed to create company. Please check if the OIB already exists and try again.'
        );
      },
    });
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setOibValidation(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
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

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Company Information */}
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
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="oib">Croatian OIB (Tax Number) *</Label>
                  <div className="relative">
                    <Input
                      id="oib"
                      value={formData.oib}
                      onChange={(e) => handleOibChange(e.target.value)}
                      placeholder="12345678901"
                      maxLength={11}
                      className={
                        oibValidation
                          ? oibValidation.isValid
                            ? 'border-green-300 focus:border-green-500'
                            : 'border-red-300 focus:border-red-500'
                          : ''
                      }
                      required
                    />
                    {oibValidation && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                        {oibValidation.isValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {oibValidation && (
                    <p
                      className={`mt-1 text-xs ${oibValidation.isValid ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {oibValidation.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                    }
                    placeholder="12345"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
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

          {/* Contact Information */}
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
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+385 XX XXX XXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="fax">Fax (Optional)</Label>
                  <Input
                    id="fax"
                    value={formData.fax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fax: e.target.value }))}
                    placeholder="+385 XX XXX XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings */}
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
                    value={formData.roomAllocationGuarantee}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        roomAllocationGuarantee: parseInt(e.target.value) || 0,
                      }))
                    }
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
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <Label htmlFor="isActive">Active Company</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this company..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCompanyMutation.isPending || !oibValidation?.isValid}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
