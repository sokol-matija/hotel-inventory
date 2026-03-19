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
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';
import { Guest } from '../../../lib/hotel/types';
import { useGuests } from '../../../lib/queries/hooks/useGuests';

export default function GuestsPage() {
  const { data: guests = [], isLoading } = useGuests();
  const findGuestsByName = (query: string) => {
    const q = query.toLowerCase();
    return guests.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.phone ?? '').includes(q)
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Update filtered guests when search query or guests change
  React.useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredGuests(findGuestsByName(searchQuery));
    } else {
      setFilteredGuests(guests);
    }
  }, [searchQuery, guests, findGuestsByName]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Calculate stats
  const totalGuests = guests.length;
  const vipGuests = guests.filter((guest) => guest.isVip);
  const guestsWithPets = guests.filter((guest) => guest.hasPets);

  const getAgeDisplay = (dateOfBirth: Date | undefined) => {
    if (!dateOfBirth) return 'N/A';
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    return `${age} years`;
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
            <p className="text-gray-600">Manage guest profiles and information</p>
          </div>
          <Button
            onClick={() => alert('Guest creation modal coming soon')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Guest
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
                    {filteredGuests.filter((g) => g.children.length > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
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

        {/* Error Display - TODO: Add error handling */}
      </div>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle>Guests ({filteredGuests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="text-gray-500">Loading guests...</p>
              </div>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="mb-2 text-lg text-gray-500">No guests found</p>
              <p className="mb-4 text-gray-400">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Start by creating your first guest'}
              </p>
              <Button
                onClick={() => alert('Guest creation modal coming soon')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Guest
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{guest.fullName}</h3>
                          {guest.isVip && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              VIP
                            </Badge>
                          )}
                          {guest.hasPets && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <Heart className="mr-1 h-3 w-3" />
                              Pets
                            </Badge>
                          )}
                          {guest.children.length > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Baby className="mr-1 h-3 w-3" />
                              {guest.children.length} child
                              {guest.children.length !== 1 ? 'ren' : ''}
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
                        onClick={() => alert('Guest details modal coming soon')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => alert('Guest deletion coming soon')}
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

      {/* TODO: Add guest creation and details modals */}
    </div>
  );
}
