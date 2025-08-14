// GuestPageV2 - Modern guest management page
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Badge } from '../../../ui/badge';
import { useGuests } from '../../../../lib/hotel/contexts/GuestContext';
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
  Filter
} from 'lucide-react';
import CreateGuestModalV2 from '../modals/CreateGuestModalV2';
import GuestDetailsModal from '../modals/GuestDetailsModal';

export default function GuestPageV2() {
  const {
    state,
    filteredGuests,
    totalGuests,
    vipGuests,
    guestsWithPets,
    searchGuests,
    selectGuest,
    deleteGuest,
    clearError
  } = useGuests();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filterVip, setFilterVip] = useState(false);
  const [filterPets, setFilterPets] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    await searchGuests(query);
  };

  const handleSelectGuest = (guest: any) => {
    selectGuest(guest);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (window.confirm('Are you sure you want to delete this guest?')) {
      const success = await deleteGuest(guestId);
      if (!success) {
        alert('Failed to delete guest. Please try again.');
      }
    }
  };

  const getFilteredGuests = () => {
    let guests = [...filteredGuests];
    
    if (filterVip) {
      guests = guests.filter(guest => guest.isVip);
    }
    
    if (filterPets) {
      guests = guests.filter(guest => guest.hasPets);
    }
    
    return guests;
  };

  const displayedGuests = getFilteredGuests();

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-500">Manage hotel guests with modern interface</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Guest
        </Button>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <span>⚠️ {state.error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
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
            <div className="text-2xl font-bold">{totalGuests}</div>
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
              Active Filters
            </CardTitle>
            <Filter className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(filterVip ? 1 : 0) + (filterPets ? 1 : 0)}
            </div>
            <p className="text-xs text-gray-500">Applied filters</p>
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
                  placeholder="Search guests by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Guests ({displayedGuests.length})</span>
            {state.isLoading && (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayedGuests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {state.isLoading ? 'Loading guests...' : 'No guests found'}
              </p>
              {!state.isLoading && (
                <p className="text-gray-400 text-sm">
                  {searchQuery ? 'Try adjusting your search or filters' : 'Add your first guest to get started'}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedGuests.map((guest) => (
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
                            VIP
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
                      onClick={() => handleSelectGuest(guest)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGuest(guest.id)}
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

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateGuestModalV2
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && state.selectedGuest && (
        <GuestDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            selectGuest(null);
          }}
          guest={state.selectedGuest}
        />
      )}
    </div>
  );
}