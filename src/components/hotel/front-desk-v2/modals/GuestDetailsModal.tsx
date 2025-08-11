// GuestDetailsModal - View and edit guest details
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Heart,
  Baby,
  UserCheck,
  Edit
} from 'lucide-react';
import { Guest } from '../../../../lib/hotel/services/GuestService';

interface GuestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest;
}

export default function GuestDetailsModal({ isOpen, onClose, guest }: GuestDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-GB');
  };

  const getAge = (dateOfBirth: Date | undefined) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Guest Details</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Header with name and badges */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{guest.fullName}</h2>
            <div className="flex justify-center space-x-2">
              {guest.isVip && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <UserCheck className="h-3 w-3 mr-1" />
                  VIP Level {guest.vipLevel}
                </Badge>
              )}
              {guest.hasPets && (
                <Badge className="bg-red-100 text-red-800">
                  <Heart className="h-3 w-3 mr-1" />
                  Has Pets
                </Badge>
              )}
              {guest.children.length > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  <Baby className="h-3 w-3 mr-1" />
                  {guest.children.length} Child{guest.children.length !== 1 ? 'ren' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guest.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{guest.email}</p>
                  </div>
                </div>
              )}
              
              {guest.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{guest.phone}</p>
                  </div>
                </div>
              )}
              
              {guest.nationality && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Nationality</p>
                    <p className="font-medium">{guest.nationality}</p>
                  </div>
                </div>
              )}
              
              {guest.dateOfBirth && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">{formatDate(guest.dateOfBirth)} ({getAge(guest.dateOfBirth)} years)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Preferred Language</p>
                <p className="font-medium">{guest.preferredLanguage}</p>
              </div>
              
              {guest.passportNumber && (
                <div>
                  <p className="text-sm text-gray-600">Passport Number</p>
                  <p className="font-medium">{guest.passportNumber}</p>
                </div>
              )}
              
              {guest.idCardNumber && (
                <div>
                  <p className="text-sm text-gray-600">ID Card Number</p>
                  <p className="font-medium">{guest.idCardNumber}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Total Stays</p>
                <p className="font-medium">{guest.totalStays} stays</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          {(guest.emergencyContactName || guest.emergencyContactPhone) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guest.emergencyContactName && (
                  <div>
                    <p className="text-sm text-gray-600">Contact Name</p>
                    <p className="font-medium">{guest.emergencyContactName}</p>
                  </div>
                )}
                {guest.emergencyContactPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Contact Phone</p>
                    <p className="font-medium">{guest.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Requirements */}
          {(guest.dietaryRestrictions.length > 0 || guest.specialNeeds) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Requirements</h3>
              
              {guest.dietaryRestrictions.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Dietary Restrictions</p>
                  <div className="flex flex-wrap gap-1">
                    {guest.dietaryRestrictions.map((restriction, index) => (
                      <Badge key={index} variant="outline">
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {guest.specialNeeds && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Special Needs</p>
                  <p className="font-medium">{guest.specialNeeds}</p>
                </div>
              )}
            </div>
          )}

          {/* Children */}
          {guest.children.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Children</h3>
              <div className="space-y-3">
                {guest.children.map((child, index) => (
                  <div key={child.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{child.firstName}</p>
                        <p className="text-sm text-gray-600">
                          Born: {formatDate(child.dateOfBirth)} ({child.currentAge} years old)
                        </p>
                      </div>
                      {child.discountCategory && (
                        <Badge variant="outline">
                          {child.discountCategory}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-sm text-gray-500 border-t pt-4">
            <p>Created: {formatDate(guest.createdAt)}</p>
            <p>Last Updated: {formatDate(guest.updatedAt)}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button className="flex-1" disabled>
              <Edit className="h-4 w-4 mr-2" />
              Edit Guest (Coming Soon)
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}