// ReservationsSearch - Debounced search input with keyboard shortcuts
// Provides instant search feedback with optimized API calls

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../../../ui/input';
import { Button } from '../../../ui/button';

interface ReservationsSearchProps {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ReservationsSearch({
  value,
  onChange,
  isSearching = false,
  placeholder,
  className = ''
}: ReservationsSearchProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to clear
      if (e.key === 'Escape' && inputRef.current === document.activeElement) {
        onChange('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        {isSearching ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Search className="w-5 h-5" />
        )}
      </div>

      {/* Input Field */}
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('reservationsList.searchPlaceholder')}
        className="pl-10 pr-24"
      />

      {/* Clear Button & Keyboard Hint */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
        {value && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-6 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {!value && (
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>
    </div>
  );
}
