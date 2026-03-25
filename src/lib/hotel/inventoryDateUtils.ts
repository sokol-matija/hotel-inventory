/**
 * Pure date-formatting and validation utilities for inventory entry.
 * Extracted from AddInventoryDialog to enable unit testing.
 */

/** Converts an ISO date string to Croatian display format: DD/MM/YYYY */
export function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts a manually-entered DD/MM/YYYY or DD/MM/YY date string
 * to ISO YYYY-MM-DD for database storage.
 * Returns '' for invalid/empty input.
 */
export function formatDateForDatabase(displayDate: string): string {
  if (!displayDate) return '';
  const parts = displayDate.split('/');
  if (parts.length !== 3) return '';
  const [day, month] = parts;
  let year = parts[2];
  if (year.length === 2) {
    const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
    year = (currentCentury + parseInt(year, 10)).toString();
  }
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Validates a manually-entered date string in DD/MM/YYYY or DD/MM/YY format.
 * Returns false for invalid dates (wrong format, non-existent day like Feb 30,
 * year outside 1900–2100).
 */
export function validateDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return false;
  const [, day, month, yearStr] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  let yearNum = parseInt(yearStr, 10);
  if (yearStr.length === 2) {
    yearNum = Math.floor(new Date().getFullYear() / 100) * 100 + yearNum;
  }
  if (monthNum < 1 || monthNum > 12) return false;
  if (dayNum < 1 || dayNum > 31) return false;
  if (yearNum < 1900 || yearNum > 2100) return false;
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return (
    date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum
  );
}
