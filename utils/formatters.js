/**
 * Utility functions for formatting data
 */

/**
 * Format a number as currency (GBP)
 * @param {number} amount - The amount to format
 * @param {string} locale - The locale to use for formatting (default: 'en-GB')
 * @param {string} currency - The currency code (default: 'GBP')
 * @returns {string} Formatted currency string
 */
exports.formatCurrency = (amount, locale = 'en-GB', currency = 'GBP') => {
  if (amount === null || amount === undefined) {
    return '£0.00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date to a readable string
 * @param {Date|string} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
exports.formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format a number with commas as thousands separators
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
exports.formatNumber = (number) => {
  if (number === null || number === undefined) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-GB').format(number);
};

/**
 * Format a percentage value
 * @param {number} value - The value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
exports.formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) {
    return '0%';
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string
 */
exports.truncateString = (str, maxLength = 100) => {
  if (!str) return '';
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength) + '...';
};
