// Croatian date formatting utilities
// Cached formatters to avoid repeated timezone lookups and improve performance

// Cache formatters to avoid repeated timezone lookups
const dateFormatter = new Intl.DateTimeFormat('hr-HR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const longDateFormatter = new Intl.DateTimeFormat('hr-HR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('hr-HR', {
  hour: '2-digit',
  minute: '2-digit'
});

const dateTimeFormatter = new Intl.DateTimeFormat('hr-HR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Format date as DD.MM.YYYY (Croatian standard)
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  return dateFormatter.format(dateObj);
};

/**
 * Format date as "Monday, 24 July 2025" (Croatian long format)
 */
export const formatLongDate = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  return longDateFormatter.format(dateObj);
};

/**
 * Format time as HH:mm
 */
export const formatTime = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  return timeFormatter.format(dateObj);
};

/**
 * Format date and time as DD.MM.YYYY HH:mm
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  return dateTimeFormatter.format(dateObj);
};

/**
 * Get current date formatted for display
 */
export const getCurrentDateFormatted = (): string => {
  return formatLongDate(new Date());
};

/**
 * Split formatted date and time for separate display
 */
export const formatDateTimeForDisplay = (dateString: string) => {
  if (!dateString) return { date: '', time: '' };
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { date: '', time: '' };
  
  return {
    date: formatDate(date),
    time: formatTime(date)
  };
};