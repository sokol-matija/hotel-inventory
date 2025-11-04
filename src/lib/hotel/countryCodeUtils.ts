/**
 * Country Code Utilities
 * Handles conversion between ISO 3-letter country codes and display names
 * for the Hotel Management System
 */

// Mapping from display names to ISO 3166-1 alpha-3 codes
export const COUNTRY_CODES: Record<string, string> = {
  'Croatia': 'HRV',
  'Slovenia': 'SVN',
  'Italy': 'ITA',
  'Austria': 'AUT',
  'Germany': 'DEU',
  'Other': 'OTH'
} as const;

// Reverse mapping from ISO codes to display names
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  'HRV': 'Croatia',
  'SVN': 'Slovenia',
  'ITA': 'Italy',
  'AUT': 'Austria',
  'DEU': 'Germany',
  'OTH': 'Other'
} as const;

/**
 * Convert a human-readable country name to its ISO 3-letter code
 * @param displayName - The country name as shown in the UI (e.g., "Croatia")
 * @returns The ISO 3-letter code (e.g., "HRV")
 * @throws Error if the country name is not recognized
 */
export function convertToCountryCode(displayName: string): string {
  const code = COUNTRY_CODES[displayName];

  if (!code) {
    console.warn(`Unknown country display name: "${displayName}". Defaulting to "OTH".`);
    return 'OTH'; // Default fallback
  }

  return code;
}

/**
 * Convert an ISO 3-letter country code to a human-readable display name
 * @param code - The ISO 3-letter code (e.g., "HRV")
 * @returns The country name for display (e.g., "Croatia")
 */
export function convertToDisplayName(code: string): string {
  const displayName = COUNTRY_DISPLAY_NAMES[code];

  if (!displayName) {
    console.warn(`Unknown country code: "${code}". Returning code as-is.`);
    return code; // Return the code itself if not found
  }

  return displayName;
}

/**
 * Get all available countries as display names for UI dropdowns
 * @returns Array of country display names
 */
export function getAllCountryNames(): string[] {
  return Object.keys(COUNTRY_CODES);
}

/**
 * Get all available country codes
 * @returns Array of ISO 3-letter codes
 */
export function getAllCountryCodes(): string[] {
  return Object.keys(COUNTRY_DISPLAY_NAMES);
}

/**
 * Validate if a given string is a valid country code
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export function isValidCountryCode(code: string): boolean {
  return code in COUNTRY_DISPLAY_NAMES;
}

/**
 * Validate if a given string is a valid country display name
 * @param name - The name to validate
 * @returns true if valid, false otherwise
 */
export function isValidCountryName(name: string): boolean {
  return name in COUNTRY_CODES;
}
