import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Reservation } from '../../lib/hotel/types';
import { isDateAvailableForRoom } from '../../lib/hotel/calendarUtils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfDay
} from 'date-fns';

interface CalendarDatePickerProps {
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

export function CalendarDatePicker({
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
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const minDate = min ? new Date(min) : null;
  const maxDate = max ? new Date(max) : null;

  const isDateSelectable = (date: Date) => {
    const today = startOfDay(new Date());
    const targetDate = startOfDay(date);

    // Check if date is in the past (before today)
    if (targetDate < today) return false;

    // Check min/max constraints
    if (minDate && targetDate < startOfDay(minDate)) return false;
    if (maxDate && targetDate > startOfDay(maxDate)) return false;

    // Check if room is available on this date
    return isDateAvailableForRoom(reservations, roomId, date);
  };

  const handleDateSelect = (date: Date) => {
    if (isDateSelectable(date)) {
      onChange(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const dates = [];
    let currentDate = calendarStart;

    while (currentDate <= calendarEnd) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    const weeks = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }

    return (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-[300px]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            &lt;
          </Button>
          <h3 className="font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            &gt;
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = value && isSameDay(date, new Date(value));
              const isTodayDate = isToday(date);
              const isSelectable = isDateSelectable(date);
              const isOccupied = !isDateAvailableForRoom(reservations, roomId, date) && startOfDay(date) >= startOfDay(new Date());

              return (
                <button
                  key={`${weekIndex}-${dayIndex}`}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  disabled={!isSelectable}
                  className={`
                    p-2 text-sm rounded-md transition-colors relative
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isTodayDate ? 'bg-blue-100 font-semibold' : ''}
                    ${isSelected ? 'bg-blue-600 text-white' : ''}
                    ${isSelectable && !isSelected && isCurrentMonth ? 'hover:bg-gray-100' : ''}
                    ${!isSelectable ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                    ${isOccupied && isCurrentMonth ? 'bg-red-100 text-red-400' : ''}
                  `}
                >
                  {format(date, 'd')}
                  {isOccupied && isCurrentMonth && (
                    <span className="absolute top-0.5 right-0.5 text-xs text-red-500">❌</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 rounded"></div>
            <span>Occupied (unavailable)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>Selected</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <Label htmlFor={id}>{label} {required && '*'}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value ? format(new Date(value), 'MMM dd, yyyy') : ''}
          placeholder="Select date..."
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`${className} cursor-pointer pr-10`}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
        </Button>
        
        {isOpen && renderCalendar()}
      </div>

      {/* Show warning if current value is occupied */}
      {value && !isDateAvailableForRoom(reservations, roomId, new Date(value)) && (
        <div className="text-sm text-red-600 mt-1">
          ⚠️ This date is occupied by another reservation
        </div>
      )}
    </div>
  );
}