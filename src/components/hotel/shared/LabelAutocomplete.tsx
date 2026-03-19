/**
 * LabelAutocomplete - Autocomplete component for label selection
 *
 * Features:
 * - Search labels with type-ahead (300ms debounce)
 * - Create new labels on-the-fly
 * - Displays existing labels with LabelBadge
 * - Uses Input + custom dropdown (no external dependencies)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Label as LabelType } from '../../../lib/hotel/types';
import labelService from '../../../lib/hotel/services/LabelService';
import LabelBadge from './LabelBadge';
import { Input } from '../../ui/input';

interface LabelAutocompleteProps {
  hotelId: string;
  value: string | null;
  onChange: (labelId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const LabelAutocomplete: React.FC<LabelAutocompleteProps> = ({
  hotelId,
  value,
  onChange,
  placeholder = 'Search or create label...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<LabelType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all labels on mount
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const allLabelsList = await labelService.listLabels(hotelId);
        setAllLabels(allLabelsList);

        // Set selected label if value is provided
        if (value) {
          const selected = allLabelsList.find((l) => l.id === value);
          if (selected) {
            setSelectedLabel(selected);
          }
        }
      } catch (error) {
        console.error('Error loading labels:', error);
      }
    };

    if (hotelId) {
      loadLabels();
    }
  }, [hotelId, value]);

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          const results = await labelService.searchLabels(hotelId, searchQuery);
          setLabels(results);
        } catch (error) {
          console.error('Error searching labels:', error);
          setLabels([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Show all labels when search is empty
        setLabels(allLabels);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, hotelId, allLabels]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateLabel = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const newLabel = await labelService.createLabel({
        hotelId,
        name: searchQuery,
        // Colors will be auto-assigned from random pool
      });

      // Update state
      setAllLabels((prev) => [...prev, newLabel]);
      setSelectedLabel(newLabel);
      onChange(newLabel.id);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating label:', error);
      alert(error instanceof Error ? error.message : 'Failed to create label');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLabel = (label: LabelType) => {
    setSelectedLabel(label);
    onChange(label.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabel(null);
    onChange(null);
    setSearchQuery('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchQuery && allLabels.length > 0) {
      setLabels(allLabels);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Display selected label or input */}
      {selectedLabel && !isOpen ? (
        <div className="flex items-center gap-2 rounded-md border bg-white p-2">
          <LabelBadge label={selectedLabel} />
          <button
            type="button"
            onClick={handleClearSelection}
            className="ml-auto text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
        </div>
      )}

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-gray-500">Searching...</div>
          ) : labels.length === 0 && searchQuery ? (
            <button
              type="button"
              onClick={handleCreateLabel}
              className="flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 text-blue-500" />
              <span>
                Create "<span className="font-medium">{searchQuery}</span>"
              </span>
            </button>
          ) : labels.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              No labels yet. Type to create one.
            </div>
          ) : (
            <>
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => handleSelectLabel(label)}
                  className={cn(
                    'flex w-full items-center gap-2 p-3 text-left hover:bg-gray-50',
                    selectedLabel?.id === label.id && 'bg-blue-50'
                  )}
                >
                  <LabelBadge label={label} />
                  <span className="text-sm text-gray-700">{label.name}</span>
                </button>
              ))}
              {searchQuery &&
                !labels.find((l) => l.name === searchQuery.toLowerCase().replace(/\s+/g, '-')) && (
                  <div className="border-t">
                    <button
                      type="button"
                      onClick={handleCreateLabel}
                      className="flex w-full items-center gap-2 p-3 text-left text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        Create "<span className="font-medium">{searchQuery}</span>"
                      </span>
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LabelAutocomplete;
