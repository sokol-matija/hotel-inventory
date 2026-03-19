// Country flag emoji mappings for guest nationalities
export const COUNTRY_FLAGS: Record<string, string> = {
  German: '🇩🇪',
  Italian: '🇮🇹',
  Austrian: '🇦🇹',
  British: '🇬🇧',
  Croatian: '🇭🇷',
  Slovenian: '🇸🇮',
  French: '🇫🇷',
  Dutch: '🇳🇱',
  American: '🇺🇸',
  Canadian: '🇨🇦',
  Australian: '🇦🇺',
  Swiss: '🇨🇭',
  Belgian: '🇧🇪',
  Spanish: '🇪🇸',
  Portuguese: '🇵🇹',
  Polish: '🇵🇱',
  Czech: '🇨🇿',
  Hungarian: '🇭🇺',
  Slovak: '🇸🇰',
  Norwegian: '🇳🇴',
  Swedish: '🇸🇪',
  Danish: '🇩🇰',
  Finnish: '🇫🇮',
};

/**
 * Get flag emoji for guest nationality
 * @param nationality - Guest nationality string
 * @returns Flag emoji or default flag if not found
 */
export function getCountryFlag(nationality: string): string {
  return COUNTRY_FLAGS[nationality] || '🏳️';
}

/**
 * Get country name from nationality for accessibility
 * @param nationality - Guest nationality string
 * @returns Country name for screen readers
 */
export function getCountryName(nationality: string): string {
  return nationality || 'Unknown';
}
