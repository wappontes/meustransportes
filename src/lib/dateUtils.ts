// Utility functions to handle dates without timezone issues

/**
 * Converts a date string from input[type="date"] to a Date object in local timezone
 * This prevents the "one day off" bug caused by UTC conversion
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats a date to YYYY-MM-DD string for input[type="date"]
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
