// utils/formatters.js

/**
 * Format currency values
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format currency with compact notation (K, M, B)
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted compact currency string
 */
const formatCurrencyCompact = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
};

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format style (short, medium, long, full)
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'medium', locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const options = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  };
  
  return new Intl.DateTimeFormat(locale, options[format] || options.medium).format(dateObj);
};

/**
 * Format time
 * @param {Date|string} date - Date to format time from
 * @param {string} format - Format style (short, medium, long)
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted time string
 */
const formatTime = (date, format = 'short', locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Time';
  
  const options = {
    short: { hour: 'numeric', minute: '2-digit' },
    medium: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    long: { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true },
  };
  
  return new Intl.DateTimeFormat(locale, options[format] || options.short).format(dateObj);
};

/**
 * Format datetime
 * @param {Date|string} date - Date to format
 * @param {string} dateFormat - Date format style
 * @param {string} timeFormat - Time format style
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted datetime string
 */
const formatDateTime = (date, dateFormat = 'medium', timeFormat = 'short', locale = 'en-US') => {
  return `${formatDate(date, dateFormat, locale)} at ${formatTime(date, timeFormat, locale)}`;
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted number string
 */
const formatNumber = (num, decimals = 0, locale = 'en-US') => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted percentage string
 */
const formatPercentage = (value, decimals = 1, locale = 'en-US') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted file size string
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @param {string} format - Format pattern (default: '(XXX) XXX-XXXX')
 * @returns {string} Formatted phone number
 */
const formatPhone = (phone, format = '(XXX) XXX-XXXX') => {
  if (!phone) return 'N/A';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 0) return 'N/A';
  
  let result = format;
  let cleanedIndex = 0;
  
  for (let i = 0; i < result.length && cleanedIndex < cleaned.length; i++) {
    if (result[i] === 'X') {
      result = result.substring(0, i) + cleaned[cleanedIndex] + result.substring(i + 1);
      cleanedIndex++;
    }
  }
  
  return result;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation (default: 50)
 * @param {string} suffix - Suffix to append (default: '...')
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format order status
 * @param {string} status - Order status
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted status string
 */
const formatStatus = (status, locale = 'en-US') => {
  if (!status) return 'Unknown';
  
  const statusMap = {
    'PENDING': 'Pending',
    'PROCESSING': 'Processing',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'REFUNDED': 'Refunded',
    'FAILED': 'Failed',
    'PAID': 'Paid',
    'UNPAID': 'Unpaid',
    'SHIPPED': 'Shipped',
    'DELIVERED': 'Delivered',
    'ACTIVE': 'Active',
    'INACTIVE': 'Inactive',
    'LOW_STOCK': 'Low Stock',
    'OUT_OF_STOCK': 'Out of Stock',
    'IN_STOCK': 'In Stock',
    'OVER_STOCK': 'Over Stock',
  };
  
  return statusMap[status] || status.replace(/_/g, ' ');
};

/**
 * Format duration (seconds to readable time)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '0s';
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Relative time string
 */
const formatRelativeTime = (date, locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 2419200) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 29030400) {
    const months = Math.floor(diffInSeconds / 2419200);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(diffInSeconds / 29030400);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

/**
 * Format address
 * @param {Object} address - Address object with street, city, state, country, zipCode
 * @param {string} separator - Separator between parts (default: ', ')
 * @returns {string} Formatted address
 */
const formatAddress = (address, separator = ', ') => {
  if (!address) return 'N/A';
  
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  if (address.country) parts.push(address.country);
  
  return parts.length > 0 ? parts.join(separator) : 'N/A';
};

/**
 * Format JSON for display
 * @param {Object} obj - Object to format
 * @param {number} indent - Indentation spaces (default: 2)
 * @returns {string} Formatted JSON string
 */
const formatJSON = (obj, indent = 2) => {
  if (!obj) return 'N/A';
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return 'Invalid JSON';
  }
};

/**
 * Sanitize string for CSV/Excel export
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (!str) return '';
  // Remove any non-printable characters
  return String(str).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
};

/**
 * Format slug for URLs
 * @param {string} text - Text to slugify
 * @returns {string} Slugified string
 */
const slugify = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Format initials from name
 * @param {string} name - Full name
 * @param {number} count - Number of initials to return (default: 2)
 * @returns {string} Initials
 */
const getInitials = (name, count = 2) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, count)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
  return initials || '';
};

module.exports = {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatPhone,
  truncateText,
  formatStatus,
  formatDuration,
  formatRelativeTime,
  formatAddress,
  formatJSON,
  sanitizeString,
  slugify,
  getInitials,
};