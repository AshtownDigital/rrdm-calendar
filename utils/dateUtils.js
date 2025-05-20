/**
 * Date Utility Functions
 * Provides helper functions for date formatting and manipulation
 */

/**
 * Format a date to a human-readable string
 * @param {Date|string} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} - The formatted date string
 */
const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  // Convert to Date object if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Default options
  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  // Merge default options with provided options
  const formattingOptions = { ...defaultOptions, ...options };
  
  // Format the date using Intl.DateTimeFormat
  return new Intl.DateTimeFormat('en-GB', formattingOptions).format(dateObj);
};

/**
 * Get the difference between two dates in days
 * @param {Date|string} date1 - The first date
 * @param {Date|string} date2 - The second date
 * @returns {number} - The difference in days
 */
const getDaysDifference = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Convert to UTC to avoid timezone issues
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  // Calculate difference in days
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} - True if the date is in the past
 */
const isDateInPast = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return dateObj < now;
};

module.exports = {
  formatDate,
  getDaysDifference,
  isDateInPast
};
