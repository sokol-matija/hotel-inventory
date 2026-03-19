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
  className = '',
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
      <div className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400">
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </div>

      {/* Input Field */}
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('reservationsList.searchPlaceholder')}
        className="pr-24 pl-10"
      />

      {/* Clear Button & Keyboard Hint */}
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 transform items-center gap-2">
        {value && (
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-6 px-2">
            <X className="h-4 w-4" />
          </Button>
        )}

        {!value && (
          <kbd className="hidden h-5 items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600 select-none sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>
    </div>
  );
}
