/**
 * LabelAutocomplete - Autocomplete component for label selection
 *
 * Features:
 * - Search labels with type-ahead (300ms debounce)
 * - Create new labels on-the-fly
 * - Displays existing labels with LabelBadge
 * - Uses shadcn/ui Popover and Command components
 *
 * Usage in ModernCreateBookingModal:
 * <LabelAutocomplete
 *   hotelId={hotelId}
 *   value={selectedLabelId}
 *   onChange={setSelectedLabelId}
 * />
 */

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Label } from '../../../lib/hotel/types';
import LabelService from '../../../lib/hotel/services/LabelService';
import LabelBadge from './LabelBadge';
import { Button } from '../../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/command';

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
  placeholder = "Search or create label...",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);

  const labelService = LabelService.getInstance();

  // Load all labels on mount (for display and selection)
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const allLabelsList = await labelService.listLabels(hotelId);
        setAllLabels(allLabelsList);

        // Set selected label if value is provided
        if (value) {
          const selected = allLabelsList.find(l => l.id === value);
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

  const handleCreateLabel = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const newLabel = await labelService.createLabel({
        hotelId,
        name: searchQuery,
        color: '#000000',
        bgColor: '#FFFFFF'
      });

      // Update state
      setAllLabels(prev => [...prev, newLabel]);
      setSelectedLabel(newLabel);
      onChange(newLabel.id);
      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error('Error creating label:', error);
      alert(error instanceof Error ? error.message : 'Failed to create label');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLabel = (label: Label) => {
    setSelectedLabel(label);
    onChange(label.id);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabel(null);
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedLabel && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            {selectedLabel ? (
              <LabelBadge label={selectedLabel} size="sm" />
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedLabel && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClearSelection}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Type to search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            {!isLoading && labels.length === 0 && searchQuery && (
              <CommandEmpty>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleCreateLabel}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{searchQuery}"
                </Button>
              </CommandEmpty>
            )}
            {!isLoading && labels.length === 0 && !searchQuery && (
              <CommandEmpty>No labels yet. Type to create one.</CommandEmpty>
            )}
            {!isLoading && labels.length > 0 && (
              <CommandGroup>
                {labels.map((label) => (
                  <CommandItem
                    key={label.id}
                    value={label.id}
                    onSelect={() => handleSelectLabel(label)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLabel?.id === label.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <LabelBadge label={label} size="sm" />
                  </CommandItem>
                ))}
                {searchQuery && !labels.find(l => l.name === searchQuery.toLowerCase().replace(/\s+/g, '-')) && (
                  <CommandItem
                    value="create-new"
                    onSelect={handleCreateLabel}
                    className="cursor-pointer border-t"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      Create "{searchQuery}"
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LabelAutocomplete;
