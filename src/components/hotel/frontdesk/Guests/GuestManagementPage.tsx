import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  User,
  Users,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Globe,
  Baby,
  Calendar,
  Filter,
  Download,
  Eye,
} from 'lucide-react';
import { Guest } from '../../../../lib/hotel/types';
import { useGuests } from '../../../../lib/queries/hooks/useGuests';
import { useReservations } from '../../../../lib/queries/hooks/useReservations';
import GuestProfileModal from './GuestProfileModal';

interface GuestManagementPageProps {
  onGuestSelect?: (guest: Guest) => void;
}

export default function GuestManagementPage({ onGuestSelect }: GuestManagementPageProps) {
  const { data: guests = [] } = useGuests();
  const { data: reservations = [] } = useReservations();
  const getGuestStayHistory = (guestId: string) =>
    reservations
      .filter((r) => r.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterNationality, setFilterNationality] = useState<string>('');
  const [filterVipOnly, setFilterVipOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'totalStays' | 'lastStay'>('name');

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.fullName.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query) ||
          guest.phone?.toLowerCase().includes(query) ||
          guest.nationality?.toLowerCase().includes(query)
      );
    }

    // Apply nationality filter
    if (filterNationality) {
      filtered = filtered.filter((guest) => guest.nationality === filterNationality);
    }

    // Apply VIP filter
    if (filterVipOnly) {
      filtered = filtered.filter((guest) => guest.isVip);
    }

    // Sort guests
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'totalStays':
          return b.totalStays - a.totalStays;
        case 'lastStay':
          // This would require reservation data - simplified for now
          return b.totalStays - a.totalStays;
        case 'name':
        default:
          return a.fullName.localeCompare(b.fullName);
      }
    });
  }, [guests, searchQuery, filterNationality, filterVipOnly, sortBy]);

  // Get unique nationalities for filter
  const nationalities = useMemo(() => {
    const unique = new Set(guests.map((guest) => guest.nationality));
    return Array.from(unique).sort();
  }, [guests]);

  const handleGuestSelect = (guest: Guest) => {
    setSelectedGuest(guest);
    if (onGuestSelect) {
      onGuestSelect(guest);
    }
  };

  const handleViewGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setModalMode('view');
    setShowGuestModal(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setModalMode('edit');
    setShowGuestModal(true);
  };

  const handleCreateGuest = () => {
    setSelectedGuest(null);
    setModalMode('create');
    setShowGuestModal(true);
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
  };

  const getGuestStats = () => {
    const totalGuests = guests.length;
    const vipGuests = guests.filter((g) => g.isVip).length;
    const guestsWithChildren = guests.filter((g) => g.children.length > 0).length;
    const guestsWithPets = guests.filter((g) => g.hasPets).length;

    return { totalGuests, vipGuests, guestsWithChildren, guestsWithPets };
  };

  const stats = getGuestStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Guest Management</h2>
          <p className="text-gray-600">Manage guest profiles and booking history</p>
        </div>
        <Button onClick={handleCreateGuest}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Guest
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalGuests}</p>
                <p className="text-sm text-gray-600">Total Guests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.vipGuests}</p>
                <p className="text-sm text-gray-600">VIP Guests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Baby className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.guestsWithChildren}</p>
                <p className="text-sm text-gray-600">With Children</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🐕</span>
              <div>
                <p className="text-2xl font-bold">{stats.guestsWithPets}</p>
                <p className="text-sm text-gray-600">With Pets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name, email, phone, or nationality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <select
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
              value={filterNationality}
              onChange={(e) => setFilterNationality(e.target.value)}
            >
              <option value="">All Nationalities</option>
              {nationalities.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="checkbox"
                checked={filterVipOnly}
                onChange={(e) => setFilterVipOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">VIP Only</span>
            </label>

            <div className="flex items-center space-x-2">
              <span className="text-sm">Sort by:</span>
              <select
                className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'totalStays' | 'lastStay')}
              >
                <option value="name">Name</option>
                <option value="totalStays">Total Stays</option>
                <option value="lastStay">Last Stay</option>
              </select>
            </div>

            <div className="ml-auto flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <span className="text-sm text-gray-500">
                {filteredGuests.length} of {guests.length} guests
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGuests.length === 0 ? (
            <div className="py-8 text-center">
              <User className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No guests found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuests.map((guest) => {
                const stayHistory = getGuestStayHistory(guest.id);
                return (
                  <div
                    key={guest.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>

                        <div className="flex-1">
                          <div className="mb-1 flex items-center space-x-2">
                            <h4 className="text-lg font-semibold">{guest.fullName}</h4>
                            {guest.isVip && (
                              <Badge variant="secondary">
                                <Star className="mr-1 h-3 w-3" />
                                VIP
                              </Badge>
                            )}
                            {guest.hasPets && <span className="text-sm">🐕</span>}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{guest.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>
                                {guest.phone ? formatPhoneNumber(guest.phone) : 'No phone'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Globe className="h-3 w-3" />
                              <span>{guest.nationality}</span>
                            </div>
                          </div>

                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{guest.totalStays} stays</span>
                            </div>
                            {guest.children.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Baby className="h-3 w-3" />
                                <span>{guest.children.length} children</span>
                              </div>
                            )}
                            {stayHistory.length > 0 && (
                              <span>Last stay: {stayHistory[0]?.checkIn.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewGuest(guest)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditGuest(guest)}>
                          Edit
                        </Button>
                        {onGuestSelect && (
                          <Button size="sm" onClick={() => handleGuestSelect(guest)}>
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        guest={selectedGuest}
        mode={modalMode}
        onSave={(_guest) => {
          setShowGuestModal(false);
        }}
      />
    </div>
  );
}
