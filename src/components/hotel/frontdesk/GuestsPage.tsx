import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { 
  Search, 
  Plus, 
  Users, 
  UserCheck, 
  Heart,
  Mail,
  Phone,
  MapPin,
  Baby,
  Edit,
  Trash2,
  Eye,
  Filter
} from 'lucide-react';
import { useGuests } from '../../../lib/hotel/contexts/GuestContext';
import { Guest } from '../../../lib/hotel/services/GuestService';
import CreateGuestModal from './modals/CreateGuestModal';
import GuestDetailsModal from './modals/GuestDetailsModal';

export default function GuestsPage() {
  const {
    state,
    searchGuests,
    selectGuest,
    deleteGuest,
    clearError,
    filteredGuests,
    totalGuests,
    vipGuests,
    guestsWithPets,
  } = useGuests();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchGuests(query);
  };

  // Handle view guest details
  const handleViewGuest = (guest: Guest) => {
    selectGuest(guest);
    setShowDetailsModal(true);
  };

  // Handle delete guest
  const handleDeleteGuest = async (guest: Guest) => {
    if (window.confirm(`Are you sure you want to delete ${guest.fullName}?`)) {
      const success = await deleteGuest(guest.id);
      if (success) {
        // Success feedback handled by context
      }
    }
  };

  // Handle guest created
  const handleGuestCreated = () => {
    setShowCreateModal(false);
    // Guest list will update automatically via context
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-GB');
  };

  const getAgeDisplay = (dateOfBirth: Date | undefined) => {
    if (!dateOfBirth) return 'N/A';
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    return `${age} years`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
            <p className="text-gray-600">Manage guest profiles and information</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Guest
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGuests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">VIP Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{vipGuests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">With Pets</p>
                  <p className="text-2xl font-bold text-gray-900">{guestsWithPets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Baby className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">With Children</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredGuests.filter(g => g.children.length > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search guests by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <div className="flex items-center justify-between">
              <span>{state.error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                ×
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle>Guests ({filteredGuests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {state.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading guests...</p>
              </div>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No guests found</p>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Start by creating your first guest'}
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add First Guest
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{guest.fullName}</h3>
                          {guest.isVip && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              VIP
                            </Badge>
                          )}
                          {guest.hasPets && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <Heart className="h-3 w-3 mr-1" />
                              Pets
                            </Badge>
                          )}
                          {guest.children.length > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Baby className="h-3 w-3 mr-1" />
                              {guest.children.length} child{guest.children.length !== 1 ? 'ren' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {guest.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{guest.email}</span>
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{guest.phone}</span>
                            </div>
                          )}
                          {guest.nationality && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{guest.nationality}</span>
                            </div>
                          )}
                          <span>Age: {getAgeDisplay(guest.dateOfBirth)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewGuest(guest)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteGuest(guest)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateGuestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onGuestCreated={handleGuestCreated}
        />
      )}

      {showDetailsModal && state.selectedGuest && (
        <GuestDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          guest={state.selectedGuest}
        />
      )}
    </div>
  );
}