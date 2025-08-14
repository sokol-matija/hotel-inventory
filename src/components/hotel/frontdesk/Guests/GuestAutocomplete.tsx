import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Mail, Globe, Users, X } from 'lucide-react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Guest } from '../../../../lib/hotel/types';
import { useHotel } from '../../../../lib/hotel/state/SupabaseHotelContext';

interface GuestAutocompleteProps {
  onGuestSelect: (guest: Guest) => void;
  onCreateNew: () => void;
  placeholder?: string;
  selectedGuest?: Guest | null;
  className?: string;
}

export default function GuestAutocomplete({
  onGuestSelect,
  onCreateNew,
  placeholder = "Search guests by name, email, or phone...",
  selectedGuest,
  className = ""
}: GuestAutocompleteProps) {
  const { guests } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter guests based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGuests([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = guests.filter(guest => 
      guest.fullName.toLowerCase().includes(query) ||
      (guest.email && guest.email.toLowerCase().includes(query)) ||
      (guest.phone && guest.phone.toLowerCase().includes(query)) ||
      (guest.nationality && guest.nationality.toLowerCase().includes(query))
    ).slice(0, 8); // Limit to 8 results

    setFilteredGuests(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [searchQuery, guests]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredGuests.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredGuests.length) {
          handleGuestSelect(filteredGuests[highlightedIndex]);
        } else if (filteredGuests.length === 1) {
          handleGuestSelect(filteredGuests[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleGuestSelect = (guest: Guest) => {
    onGuestSelect(guest);
    setSearchQuery(guest.fullName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearSelection = () => {
    setSearchQuery('');
    onGuestSelect(null as any);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPhoneNumber = (phone: string) => {
    // Simple formatting for display
    return phone.replace(/(\+\d{1,3})-?(\d{1,3})-?(\d+)/, '$1 $2 $3');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Guest Display */}
      {selectedGuest && !isOpen && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold">{selectedGuest.fullName}</h4>
                    {selectedGuest.isVip && (
                      <Badge variant="secondary" className="text-xs">VIP</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{selectedGuest.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{selectedGuest.phone ? formatPhoneNumber(selectedGuest.phone) : 'No phone'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>{selectedGuest.nationality}</span>
                    </div>
                  </div>
                  {selectedGuest.children.length > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                      <Users className="h-3 w-3" />
                      <span>{selectedGuest.children.length} children</span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Input */}
      {!selectedGuest || isOpen ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchQuery && filteredGuests.length > 0) {
                  setIsOpen(true);
                }
              }}
            />
          </div>

          {/* Dropdown Results */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {filteredGuests.map((guest, index) => (
                <div
                  key={guest.id}
                  className={`p-4 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                    index === highlightedIndex ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleGuestSelect(guest)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{guest.fullName}</span>
                          {guest.isVip && (
                            <Badge variant="secondary" className="text-xs">VIP</Badge>
                          )}
                          {guest.hasPets && (
                            <span className="text-xs">🐕</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <span>{guest.email}</span>
                          <span>{guest.phone ? formatPhoneNumber(guest.phone) : 'No phone'}</span>
                          <span>🌍 {guest.nationality}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                          <span>{guest.totalStays} stays</span>
                          {guest.children.length > 0 && (
                            <span>{guest.children.length} children</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Create New Guest Option */}
              <div
                className="p-4 cursor-pointer border-t border-gray-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                onClick={() => {
                  onCreateNew();
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Create new guest profile</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {searchQuery ? `for "${searchQuery}"` : 'Add a new guest to the database'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}