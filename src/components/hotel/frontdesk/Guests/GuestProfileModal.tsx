import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Save,
  X,
  Edit,
  Star,
  Baby
} from 'lucide-react';
import { Guest, GuestChild } from '../../../../lib/hotel/types';
import { useHotel } from '../../../../lib/hotel/state/HotelContext';

interface GuestProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest?: Guest | null;
  initialData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  mode: 'view' | 'edit' | 'create';
  onSave?: (guest: Guest) => void;
}

const NATIONALITIES = [
  'German', 'Italian', 'Austrian', 'Croatian', 'French', 'Swiss', 
  'Dutch', 'Belgian', 'Czech', 'Slovenian', 'Hungarian', 'Polish',
  'British', 'Spanish', 'Other'
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'fr', name: 'French' },
  { code: 'hr', name: 'Croatian' },
  { code: 'other', name: 'Other' }
];

export default function GuestProfileModal({
  isOpen,
  onClose,
  guest,
  initialData,
  mode,
  onSave
}: GuestProfileModalProps) {
  const { createGuest, updateGuest } = useHotel();
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Guest>>({});
  const [children, setChildren] = useState<Partial<GuestChild>[]>([]);

  // Initialize form data
  useEffect(() => {
    if (guest) {
      setFormData(guest);
      setChildren(guest.children || []);
    } else if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        nationality: 'German',
        preferredLanguage: 'de',
        hasPets: false,
        children: [],
        totalStays: 0,
        isVip: false,
        emergencyContact: ''
      });
      setChildren([]);
    }
  }, [guest, initialData, isOpen]);

  const handleInputChange = (field: keyof Guest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addChild = () => {
    setChildren(prev => [...prev, { name: '', age: 0, dateOfBirth: new Date() }]);
  };

  const updateChild = (index: number, field: keyof GuestChild, value: any) => {
    setChildren(prev => prev.map((child, i) => 
      i === index ? { ...child, [field]: value } : child
    ));
  };

  const removeChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        alert('Please fill in all required fields');
        return;
      }

      // Process children data
      const processedChildren: GuestChild[] = children
        .filter(child => child.name && child.dateOfBirth)
        .map(child => ({
          name: child.name!,
          dateOfBirth: new Date(child.dateOfBirth!),
          age: child.dateOfBirth ? calculateAge(new Date(child.dateOfBirth)) : 0
        }));

      const guestData: Guest = {
        id: guest?.id || `guest-${Date.now()}`,
        name: formData.name!,
        email: formData.email!,
        phone: formData.phone!,
        emergencyContact: formData.emergencyContact || '',
        nationality: formData.nationality || 'German',
        preferredLanguage: formData.preferredLanguage || 'en',
        passportDocument: formData.passportDocument,
        hasPets: formData.hasPets || false,
        dateOfBirth: formData.dateOfBirth,
        children: processedChildren,
        totalStays: formData.totalStays || 0,
        isVip: formData.isVip || false
      };

      if (mode === 'create') {
        await createGuest(guestData);
      } else {
        await updateGuest(guestData.id, guestData);
      }

      if (onSave) {
        onSave(guestData);
      }

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Failed to save guest:', error);
      alert('Failed to save guest profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" />
              <span>
                {mode === 'create' ? 'Create New Guest' : 
                 isEditing ? 'Edit Guest Profile' : 'Guest Profile'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {mode !== 'create' && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditing(false);
                    if (mode === 'create') onClose();
                  }}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
                {formData.isVip && (
                  <Badge variant="secondary" className="ml-2">
                    <Star className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <p className="p-2 text-gray-900">{formData.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="guest@example.com"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+49-30-12345678"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{formatPhoneNumber(formData.phone || '')}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.emergencyContact || ''}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Contact person and phone"
                    />
                  ) : (
                    <p className="p-2 text-gray-700">{formData.emergencyContact || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality
                  </label>
                  {isEditing ? (
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.nationality || ''}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                    >
                      {NATIONALITIES.map(nationality => (
                        <option key={nationality} value={nationality}>{nationality}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 p-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{formData.nationality}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Language
                  </label>
                  {isEditing ? (
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      value={formData.preferredLanguage || ''}
                      onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="p-2 text-gray-700">
                      {LANGUAGES.find(l => l.code === formData.preferredLanguage)?.name || formData.preferredLanguage}
                    </p>
                  )}
                </div>
              </div>

              {/* Special Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasPets || false}
                        onChange={(e) => handleInputChange('hasPets', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>Travels with pets</span>
                    </label>
                  ) : (
                    formData.hasPets && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>🐕</span>
                        <span>Travels with pets</span>
                      </div>
                    )
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isVip || false}
                        onChange={(e) => handleInputChange('isVip', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>VIP Status</span>
                    </label>
                  ) : (
                    formData.isVip && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        VIP Guest
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Children Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Baby className="h-5 w-5" />
                  <span>Children ({children.length})</span>
                </div>
                {isEditing && (
                  <Button size="sm" onClick={addChild}>
                    Add Child
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No children registered</p>
              ) : (
                <div className="space-y-3">
                  {children.map((child, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                            placeholder="Child's name"
                            value={child.name || ''}
                            onChange={(e) => updateChild(index, 'name', e.target.value)}
                          />
                          <input
                            type="date"
                            className="p-2 border border-gray-300 rounded-md"
                            value={child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateChild(index, 'dateOfBirth', new Date(e.target.value))}
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeChild(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{child.name}</span>
                          <span className="text-sm text-gray-600">
                            Age {child.age} • Born {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stay History */}
          {!isEditing && guest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Stay History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{guest.totalStays} total stays</span>
                  </div>
                  {guest.isVip && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      VIP Guest
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}