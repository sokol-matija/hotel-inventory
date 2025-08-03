import React, { useEffect, useState, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Reservation } from '../../lib/hotel/types';
import { getRoomOccupiedDates, isDateAvailableForRoom } from '../../lib/hotel/calendarUtils';
import { format } from 'date-fns';

interface SmartDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  required?: boolean;
  reservations: Reservation[];
  roomId: string;
  disabled?: boolean;
}

export function SmartDatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  className = '',
  required = false,
  reservations,
  roomId,
  disabled = false
}: SmartDatePickerProps) {
  const [occupiedDates, setOccupiedDates] = useState<Date[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const styleElementRef = useRef<HTMLStyleElement | undefined>(undefined);

  // Calculate occupied dates when reservations, roomId, or value changes
  useEffect(() => {
    if (!roomId || !reservations.length) {
      setOccupiedDates([]);
      return;
    }

    // Calculate a reasonable date range for fetching occupied dates
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // One month ago
    const endDate = new Date(today.getFullYear() + 1, today.getMonth(), 0); // One year from now
    
    const occupied = getRoomOccupiedDates(reservations, roomId, startDate, endDate);
    setOccupiedDates(occupied);
  }, [reservations, roomId, value]);

  // Inject CSS styles for unavailable dates
  useEffect(() => {
    if (occupiedDates.length === 0) {
      // Remove existing styles if no occupied dates
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = undefined;
      }
      return;
    }

    // Create CSS rules for each occupied date
    const cssRules = occupiedDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return `
        input[type="date"][value="${dateStr}"]::before,
        input[type="date"]::-webkit-calendar-picker-indicator ~ *[aria-label*="${dateStr}"]::after,
        input[type="date"] + .date-picker-overlay[data-occupied-dates*="${dateStr}"]::after {
          content: "❌";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: #dc2626;
          z-index: 10;
          pointer-events: none;
        }
      `;
    }).join('\n');

    // Create or update style element
    if (!styleElementRef.current) {
      styleElementRef.current = document.createElement('style');
      styleElementRef.current.setAttribute('data-smart-date-picker', id);
      document.head.appendChild(styleElementRef.current);
    }

    styleElementRef.current.textContent = `
      /* Smart Date Picker - Occupied Dates Styling */
      .smart-date-picker-container {
        position: relative;
      }
      
      .smart-date-picker-container input[type="date"] {
        position: relative;
        z-index: 1;
      }
      
      /* Red X overlay for occupied dates */
      .smart-date-picker-container::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 2;
      }
      
      /* Specific styling for when occupied dates are selected */
      ${cssRules}
    `;

    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = undefined;
      }
    };
  }, [occupiedDates, id]);

  // Check if the current value is an occupied date
  const isCurrentValueOccupied = value && !isDateAvailableForRoom(
    reservations,
    roomId,
    new Date(value)
  );

  // Create data attribute with occupied dates for CSS targeting
  const occupiedDatesStr = occupiedDates.map(date => format(date, 'yyyy-MM-dd')).join(',');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Check if the selected date is occupied
    if (newValue && !isDateAvailableForRoom(reservations, roomId, new Date(newValue))) {
      // Optionally show a warning or prevent the selection
      // For now, we'll allow the selection but show visual feedback
      console.warn('Selected date is occupied:', newValue);
    }
    
    onChange(newValue);
  };

  return (
    <div className="smart-date-picker-container">
      <Label htmlFor={id}>{label} {required && '*'}</Label>
      <Input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        className={`${className} ${isCurrentValueOccupied ? 'border-red-500 focus:border-red-500' : ''}`}
        disabled={disabled}
        data-occupied-dates={occupiedDatesStr}
      />
      {isCurrentValueOccupied && (
        <div className="text-sm text-red-600 mt-1">
          ⚠️ This date is occupied by another reservation
        </div>
      )}
      {occupiedDates.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {occupiedDates.length} occupied date{occupiedDates.length !== 1 ? 's' : ''} in calendar
        </div>
      )}
    </div>
  );
}