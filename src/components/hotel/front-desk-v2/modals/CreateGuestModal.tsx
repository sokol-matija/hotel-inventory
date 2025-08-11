// CreateGuestModal - Clean guest creation modal
// Modern React patterns with proper validation

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { X, User, Plus, Trash2, Baby } from 'lucide-react';
import { useGuests } from '../../../../lib/hotel/contexts/GuestContext';
import { CreateGuestData, GuestChild } from '../../../../lib/hotel/services/GuestService';

interface CreateGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestCreated: () => void;
}

interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  idCardNumber: string;
  preferredLanguage: string;
  specialNeeds: string;
  hasPets: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  children: Array<{
    firstName: string;
    dateOfBirth: string;
    discountCategory: string;
  }>;
}

const initialFormData: GuestFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  nationality: '',
  passportNumber: '',
  idCardNumber: '',
  preferredLanguage: 'en',
  specialNeeds: '',
  hasPets: false,
  emergencyContactName: '',
  emergencyContactPhone: '',
  children: [],
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Croatian' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
];

const CHILD_DISCOUNT_CATEGORIES = [
  'infant', 'child', 'teenager'
];

export default function CreateGuestModal({ isOpen, onClose, onGuestCreated }: CreateGuestModalProps) {
  const { createGuest, state } = useGuests();
  const [formData, setFormData] = useState<GuestFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle form field changes
  const handleChange = (field: keyof GuestFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Add child
  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        {
          firstName: '',
          dateOfBirth: '',
          discountCategory: 'child'
        }
      ]
    }));
  };

  // Remove child
  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  // Update child data
  const updateChild = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\d\s\+\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate children
    formData.children.forEach((child, index) => {
      if (!child.firstName.trim()) {
        newErrors[`child_${index}_firstName`] = 'Child name is required';
      }
      if (!child.dateOfBirth) {
        newErrors[`child_${index}_dateOfBirth`] = 'Child date of birth is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const guestData: CreateGuestData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        nationality: formData.nationality.trim() || undefined,
        passportNumber: formData.passportNumber.trim() || undefined,
        idCardNumber: formData.idCardNumber.trim() || undefined,
        preferredLanguage: formData.preferredLanguage,
        specialNeeds: formData.specialNeeds.trim() || undefined,
        hasPets: formData.hasPets,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        children: formData.children.map(child => ({
          firstName: child.firstName.trim(),
          dateOfBirth: new Date(child.dateOfBirth),
          discountCategory: child.discountCategory
        }))
      };

      const guest = await createGuest(guestData);
      
      if (guest) {
        onGuestCreated();
        setFormData(initialFormData);
        setErrors({});
      }
    } catch (error) {
      console.error('Error creating guest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Create New Guest</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="guest@email.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+385 XX XXX XXXX"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    placeholder="German"
                  />
                </div>
                
                <div>
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    value={formData.passportNumber}
                    onChange={(e) => handleChange('passportNumber', e.target.value)}
                    placeholder="Passport number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="idCardNumber">ID Card Number</Label>
                  <Input
                    id="idCardNumber"
                    value={formData.idCardNumber}
                    onChange={(e) => handleChange('idCardNumber', e.target.value)}
                    placeholder="ID card number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="preferredLanguage">Preferred Language</Label>
                  <select
                    id="preferredLanguage"
                    value={formData.preferredLanguage}
                    onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Special Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Special Requirements</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.hasPets}
                      onChange={(e) => handleChange('hasPets', e.target.checked)}
                    />
                    <span>Guest has pets</span>
                  </label>
                </div>
                
                <div>
                  <Label htmlFor="specialNeeds">Special Needs</Label>
                  <Textarea
                    id="specialNeeds"
                    value={formData.specialNeeds}
                    onChange={(e) => handleChange('specialNeeds', e.target.value)}
                    placeholder="Any special dietary requirements, accessibility needs, etc."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </div>

            {/* Children */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Children</h3>
                <Button type="button" variant="outline" onClick={addChild} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Child
                </Button>
              </div>
              
              {formData.children.map((child, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Baby className="h-4 w-4" />
                      <span className="font-medium">Child {index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Child Name *</Label>
                      <Input
                        value={child.firstName}
                        onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                        placeholder="Child's name"
                      />
                      {errors[`child_${index}_firstName`] && (
                        <p className="text-sm text-red-600 mt-1">{errors[`child_${index}_firstName`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Date of Birth *</Label>
                      <Input
                        type="date"
                        value={child.dateOfBirth}
                        onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                      />
                      {errors[`child_${index}_dateOfBirth`] && (
                        <p className="text-sm text-red-600 mt-1">{errors[`child_${index}_dateOfBirth`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Category</Label>
                      <select
                        value={child.discountCategory}
                        onChange={(e) => updateChild(index, 'discountCategory', e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        {CHILD_DISCOUNT_CATEGORIES.map(category => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {state.error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating Guest...' : 'Create Guest'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}