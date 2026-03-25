import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, Phone, Mail, Globe, X } from 'lucide-react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Guest } from '../../../../lib/queries/hooks/useGuests';
import { useGuests } from '../../../../lib/queries/hooks/useGuests';

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
  placeholder = 'Search guests by name, email, or phone...',
  selectedGuest,
  className = '',
}: GuestAutocompleteProps) {
  const { data: guests = [] } = useGuests();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derived: filter guests based on search query inline (no useEffect needed)
  const filteredGuests = useMemo<Guest[]>(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return guests
      .filter(
        (guest) =>
          guest.display_name.toLowerCase().includes(query) ||
          (guest.email && guest.email.toLowerCase().includes(query)) ||
          (guest.phone && guest.phone.toLowerCase().includes(query)) ||
          (guest.nationality && guest.nationality.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [searchQuery, guests]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredGuests.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
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
    setSearchQuery(guest.display_name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearSelection = () => {
    setSearchQuery('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold">{selectedGuest.display_name}</h4>
                    {selectedGuest.is_vip && (
                      <Badge variant="secondary" className="text-xs">
                        VIP
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{selectedGuest.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>
                        {selectedGuest.phone ? formatPhoneNumber(selectedGuest.phone) : 'No phone'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>{selectedGuest.nationality}</span>
                    </div>
                  </div>
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
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full rounded-lg border border-gray-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(e.target.value.trim().length > 0);
                setHighlightedIndex(-1);
              }}
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
            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filteredGuests.map((guest, index) => (
                <button
                  key={guest.id}
                  type="button"
                  className={`w-full cursor-pointer border-b border-gray-100 p-4 text-left last:border-b-0 hover:bg-gray-50 ${
                    index === highlightedIndex ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleGuestSelect(guest)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleGuestSelect(guest);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{guest.display_name}</span>
                          {guest.is_vip && (
                            <Badge variant="secondary" className="text-xs">
                              VIP
                            </Badge>
                          )}
                          {guest.has_pets && <span className="text-xs">🐕</span>}
                        </div>
                        <div className="mt-1 flex items-center space-x-3 text-xs text-gray-600">
                          <span>{guest.email}</span>
                          <span>{guest.phone ? formatPhoneNumber(guest.phone) : 'No phone'}</span>
                          <span>🌍 {guest.nationality}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* Create New Guest Option */}
              <button
                type="button"
                className="w-full cursor-pointer border-t border-gray-200 bg-blue-50 p-4 text-left text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  onCreateNew();
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCreateNew();
                    setIsOpen(false);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Create new guest profile</span>
                </div>
                <p className="mt-1 text-xs text-blue-600">
                  {searchQuery ? `for "${searchQuery}"` : 'Add a new guest to the database'}
                </p>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
