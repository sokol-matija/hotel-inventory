// GuestCrudPage - Modern guest management with full CRUD operations
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Badge } from '../../../ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  Crown,
  PawPrint,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Supabase integration
import { supabase } from '../../../../lib/supabase';

// Types
interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  idCardNumber?: string;
  preferredLanguage: string;
  dietaryRestrictions?: string[];
  specialNeeds?: string;
  hasPets: boolean;
  isVip: boolean;
  vipLevel: number;
  marketingConsent: boolean;
  totalStays: number;
  totalSpent: number;
  averageRating?: number;
  lastStayDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateGuestData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  idCardNumber?: string;
  preferredLanguage: string;
  dietaryRestrictions?: string[];
  specialNeeds?: string;
  hasPets: boolean;
  notes?: string;
}

export default function GuestCrudPage() {
  // State
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVip, setFilterVip] = useState(false);
  const [filterPets, setFilterPets] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Create guest form state
  const [createForm, setCreateForm] = useState<CreateGuestData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    idCardNumber: '',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit guest form state
  const [editForm, setEditForm] = useState<CreateGuestData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    idCardNumber: '',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    notes: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Load guests from Supabase
  const loadGuests = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedGuests: Guest[] = (data || []).map(row => ({
        id: row.id?.toString() || '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        email: row.email || undefined,
        phone: row.phone || undefined,
        dateOfBirth: row.date_of_birth || undefined,
        nationality: row.nationality || undefined,
        passportNumber: row.passport_number || undefined,
        idCardNumber: row.id_card_number || undefined,
        preferredLanguage: row.preferred_language || 'en',
        dietaryRestrictions: row.dietary_restrictions || [],
        specialNeeds: row.special_needs || undefined,
        hasPets: row.has_pets || false,
        isVip: row.is_vip || false,
        vipLevel: row.vip_level || 0,
        marketingConsent: row.marketing_consent || false,
        totalStays: row.total_stays || 0,
        totalSpent: row.total_spent || 0,
        averageRating: row.average_rating || undefined,
        lastStayDate: row.last_stay_date || undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      }));

      setGuests(formattedGuests);
      setFilteredGuests(formattedGuests);
    } catch (err: any) {
      setError(`Failed to load guests: ${err.message}`);
      console.error('Error loading guests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new guest
  const createGuest = async () => {
    if (!validateCreateForm()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('guests')
        .insert({
          first_name: createForm.firstName.trim(),
          last_name: createForm.lastName.trim(),
          email: createForm.email?.trim() || null,
          phone: createForm.phone?.trim() || null,
          date_of_birth: createForm.dateOfBirth || null,
          nationality: createForm.nationality?.trim() || null,
          passport_number: createForm.passportNumber?.trim() || null,
          id_card_number: createForm.idCardNumber?.trim() || null,
          preferred_language: createForm.preferredLanguage,
          dietary_restrictions: createForm.dietaryRestrictions || [],
          special_needs: createForm.specialNeeds?.trim() || null,
          has_pets: createForm.hasPets,
          is_vip: false,
          vip_level: 0,
          marketing_consent: false,
          total_stays: 0,
          total_spent: 0,
          notes: createForm.notes?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reset form and close modal
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        nationality: '',
        passportNumber: '',
        idCardNumber: '',
        preferredLanguage: 'en',
        dietaryRestrictions: [],
        specialNeeds: '',
        hasPets: false,
        notes: '',
      });
      setFormErrors({});
      setShowCreateModal(false);
      
      // Reload guests to get the new one
      await loadGuests();
      
    } catch (err: any) {
      setError(`Failed to create guest: ${err.message}`);
      console.error('Error creating guest:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete guest
  const deleteGuest = async (guestId: string) => {
    if (!window.confirm('Are you sure you want to delete this guest?')) {
      return;
    }

    setError(null);

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setGuests(prev => prev.filter(g => g.id !== guestId));
      setFilteredGuests(prev => prev.filter(g => g.id !== guestId));
      
    } catch (err: any) {
      setError(`Failed to delete guest: ${err.message}`);
      console.error('Error deleting guest:', err);
    }
  };

  // Update guest
  const updateGuest = async () => {
    if (!editingGuest || !validateEditForm()) {
      return;
    }

    setIsCreating(true); // Reusing the same loading state
    setError(null);

    try {
      const { data, error } = await supabase
        .from('guests')
        .update({
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
          email: editForm.email?.trim() || null,
          phone: editForm.phone?.trim() || null,
          date_of_birth: editForm.dateOfBirth || null,
          nationality: editForm.nationality?.trim() || null,
          passport_number: editForm.passportNumber?.trim() || null,
          id_card_number: editForm.idCardNumber?.trim() || null,
          preferred_language: editForm.preferredLanguage,
          dietary_restrictions: editForm.dietaryRestrictions || [],
          special_needs: editForm.specialNeeds?.trim() || null,
          has_pets: editForm.hasPets,
          notes: editForm.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGuest.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Close modal and reset form
      setShowEditModal(false);
      setEditingGuest(null);
      setEditFormErrors({});
      
      // Reload guests to get the updated data
      await loadGuests();
      
    } catch (err: any) {
      setError(`Failed to update guest: ${err.message}`);
      console.error('Error updating guest:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Start editing a guest
  const startEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setEditForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || '',
      phone: guest.phone || '',
      dateOfBirth: guest.dateOfBirth || '',
      nationality: guest.nationality || '',
      passportNumber: guest.passportNumber || '',
      idCardNumber: guest.idCardNumber || '',
      preferredLanguage: guest.preferredLanguage,
      dietaryRestrictions: guest.dietaryRestrictions || [],
      specialNeeds: guest.specialNeeds || '',
      hasPets: guest.hasPets,
      notes: guest.notes || '',
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  // Form validation
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!createForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (createForm.phone && createForm.phone.length < 8) {
      errors.phone = 'Phone number must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Edit form validation
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!editForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (editForm.phone && editForm.phone.length < 8) {
      errors.phone = 'Phone number must be at least 8 characters';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Filter guests
  const applyFilters = () => {
    let filtered = [...guests];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.fullName.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.phone?.includes(query) ||
        guest.nationality?.toLowerCase().includes(query)
      );
    }

    // VIP filter
    if (filterVip) {
      filtered = filtered.filter(guest => guest.isVip);
    }

    // Pets filter
    if (filterPets) {
      filtered = filtered.filter(guest => guest.hasPets);
    }

    setFilteredGuests(filtered);
  };

  // Handle form input changes
  const handleFormChange = (field: keyof CreateGuestData, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle edit form input changes
  const handleEditFormChange = (field: keyof CreateGuestData, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Effects
  useEffect(() => {
    loadGuests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterVip, filterPets, guests]);

  // Helper functions
  const vipGuests = guests.filter(g => g.isVip);
  const guestsWithPets = guests.filter(g => g.hasPets);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-500">Modern CRUD operations with Supabase integration</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Guest
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Guests
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guests.length}</div>
            <p className="text-xs text-gray-500">All registered guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              VIP Guests
            </CardTitle>
            <Crown className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{vipGuests.length}</div>
            <p className="text-xs text-gray-500">Special status guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Guests with Pets
            </CardTitle>
            <PawPrint className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{guestsWithPets.length}</div>
            <p className="text-xs text-gray-500">Pet-friendly guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Showing Results
            </CardTitle>
            <Filter className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredGuests.length}</div>
            <p className="text-xs text-gray-500">Filtered results</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search guests by name, email, phone, or nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterVip ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterVip(!filterVip)}
                className="flex items-center gap-2"
              >
                <Crown className="h-4 w-4" />
                VIP Only
              </Button>
              <Button
                variant={filterPets ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPets(!filterPets)}
                className="flex items-center gap-2"
              >
                <PawPrint className="h-4 w-4" />
                With Pets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadGuests}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Guests ({filteredGuests.length})</span>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-gray-300 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading guests...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {guests.length === 0 ? 'No guests found' : 'No guests match your filters'}
              </p>
              {guests.length === 0 ? (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="outline"
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first guest
                </Button>
              ) : (
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  {/* Guest Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {guest.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {guest.isVip && (
                          <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
                            <Crown className="h-3 w-3 mr-1" />
                            VIP {guest.vipLevel > 0 && `L${guest.vipLevel}`}
                          </Badge>
                        )}
                        {guest.hasPets && (
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            <PawPrint className="h-3 w-3 mr-1" />
                            Pets
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guest Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {guest.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{guest.email}</span>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{guest.phone}</span>
                      </div>
                    )}
                    {guest.nationality && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{guest.nationality}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{guest.totalStays} stays</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGuest(guest);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditGuest(guest)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGuest(guest.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Guest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowCreateModal(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Create New Guest</h2>
                    <p className="text-sm text-gray-500">Add a new guest to the hotel system</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Basic Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <Input
                          value={createForm.firstName}
                          onChange={(e) => handleFormChange('firstName', e.target.value)}
                          placeholder="Enter first name"
                          className={formErrors.firstName ? 'border-red-300' : ''}
                        />
                        {formErrors.firstName && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <Input
                          value={createForm.lastName}
                          onChange={(e) => handleFormChange('lastName', e.target.value)}
                          placeholder="Enter last name"
                          className={formErrors.lastName ? 'border-red-300' : ''}
                        />
                        {formErrors.lastName && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      Contact Information
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        placeholder="guest@example.com"
                        className={formErrors.email ? 'border-red-300' : ''}
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Input
                        value={createForm.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        placeholder="+385 xx xxx xxxx"
                        className={formErrors.phone ? 'border-red-300' : ''}
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          value={createForm.dateOfBirth}
                          onChange={(e) => handleFormChange('dateOfBirth', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nationality
                        </label>
                        <Input
                          value={createForm.nationality}
                          onChange={(e) => handleFormChange('nationality', e.target.value)}
                          placeholder="e.g., Croatian, German, Italian"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Number
                        </label>
                        <Input
                          value={createForm.passportNumber}
                          onChange={(e) => handleFormChange('passportNumber', e.target.value)}
                          placeholder="Passport number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Card Number
                        </label>
                        <Input
                          value={createForm.idCardNumber}
                          onChange={(e) => handleFormChange('idCardNumber', e.target.value)}
                          placeholder="ID card number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-gray-500" />
                      Preferences
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={createForm.preferredLanguage}
                        onChange={(e) => handleFormChange('preferredLanguage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="hr">Croatian</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Needs
                      </label>
                      <Input
                        value={createForm.specialNeeds}
                        onChange={(e) => handleFormChange('specialNeeds', e.target.value)}
                        placeholder="Any special requirements or accessibility needs..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="hasPets"
                        checked={createForm.hasPets}
                        onChange={(e) => handleFormChange('hasPets', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="hasPets" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PawPrint className="h-4 w-4 text-green-500" />
                        Guest has pets
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createGuest}
                  disabled={isCreating}
                  className="flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Guest
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Details Modal */}
      {showDetailsModal && selectedGuest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDetailsModal(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedGuest.fullName}</h2>
                  <p className="text-sm text-gray-500">Guest Details</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {selectedGuest.isVip && (
                      <Badge className="text-yellow-700 bg-yellow-100">
                        <Crown className="h-3 w-3 mr-1" />
                        VIP Level {selectedGuest.vipLevel}
                      </Badge>
                    )}
                    {selectedGuest.hasPets && (
                      <Badge className="text-green-700 bg-green-100">
                        <PawPrint className="h-3 w-3 mr-1" />
                        Has Pets
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedGuest.email && (
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-600">{selectedGuest.email}</p>
                      </div>
                    )}
                    {selectedGuest.phone && (
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-600">{selectedGuest.phone}</p>
                      </div>
                    )}
                    {selectedGuest.nationality && (
                      <div>
                        <span className="font-medium text-gray-700">Nationality:</span>
                        <p className="text-gray-600">{selectedGuest.nationality}</p>
                      </div>
                    )}
                    {selectedGuest.preferredLanguage && (
                      <div>
                        <span className="font-medium text-gray-700">Language:</span>
                        <p className="text-gray-600">{selectedGuest.preferredLanguage.toUpperCase()}</p>
                      </div>
                    )}
                    {selectedGuest.dateOfBirth && (
                      <div>
                        <span className="font-medium text-gray-700">Date of Birth:</span>
                        <p className="text-gray-600">{selectedGuest.dateOfBirth}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Total Stays:</span>
                      <p className="text-gray-600">{selectedGuest.totalStays}</p>
                    </div>
                  </div>
                  
                  {selectedGuest.specialNeeds && (
                    <div>
                      <span className="font-medium text-gray-700">Special Needs:</span>
                      <p className="text-gray-600 mt-1">{selectedGuest.specialNeeds}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditModal && editingGuest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowEditModal(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Edit className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Guest</h2>
                    <p className="text-sm text-gray-500">Update {editingGuest.fullName}'s information</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Basic Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <Input
                          value={editForm.firstName}
                          onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                          placeholder="Enter first name"
                          className={editFormErrors.firstName ? 'border-red-300' : ''}
                        />
                        {editFormErrors.firstName && (
                          <p className="text-red-500 text-xs mt-1">{editFormErrors.firstName}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <Input
                          value={editForm.lastName}
                          onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                          placeholder="Enter last name"
                          className={editFormErrors.lastName ? 'border-red-300' : ''}
                        />
                        {editFormErrors.lastName && (
                          <p className="text-red-500 text-xs mt-1">{editFormErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      Contact Information
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        placeholder="guest@example.com"
                        className={editFormErrors.email ? 'border-red-300' : ''}
                      />
                      {editFormErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => handleEditFormChange('phone', e.target.value)}
                        placeholder="+385 xx xxx xxxx"
                        className={editFormErrors.phone ? 'border-red-300' : ''}
                      />
                      {editFormErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nationality
                        </label>
                        <Input
                          value={editForm.nationality}
                          onChange={(e) => handleEditFormChange('nationality', e.target.value)}
                          placeholder="e.g., Croatian, German, Italian"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Number
                        </label>
                        <Input
                          value={editForm.passportNumber}
                          onChange={(e) => handleEditFormChange('passportNumber', e.target.value)}
                          placeholder="Passport number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Card Number
                        </label>
                        <Input
                          value={editForm.idCardNumber}
                          onChange={(e) => handleEditFormChange('idCardNumber', e.target.value)}
                          placeholder="ID card number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-gray-500" />
                      Preferences
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={editForm.preferredLanguage}
                        onChange={(e) => handleEditFormChange('preferredLanguage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="hr">Croatian</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Needs
                      </label>
                      <Input
                        value={editForm.specialNeeds}
                        onChange={(e) => handleEditFormChange('specialNeeds', e.target.value)}
                        placeholder="Any special requirements or accessibility needs..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Input
                        value={editForm.notes}
                        onChange={(e) => handleEditFormChange('notes', e.target.value)}
                        placeholder="Additional notes about the guest..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="editHasPets"
                        checked={editForm.hasPets}
                        onChange={(e) => handleEditFormChange('hasPets', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="editHasPets" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PawPrint className="h-4 w-4 text-green-500" />
                        Guest has pets
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateGuest}
                  disabled={isCreating}
                  className="flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Update Guest
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}