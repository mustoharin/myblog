/**
 * Secure logging utilities to prevent information disclosure in production
 */

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Development-only console logging that won't expose information in production
 * @param {*} message - Message to log
 * @param {...any} args - Additional arguments
 */
export const devLog = (message, ...args) => {
  if (isDevelopment) {
    console.log(message, ...args);
  }
};

/**
 * Development-only console error logging
 * @param {*} message - Error message to log
 * @param {...any} args - Additional arguments
 */
export const devError = (message, ...args) => {
  if (isDevelopment) {
    console.error(message, ...args);
  }
};

/**
 * Development-only console warning logging
 * @param {*} message - Warning message to log
 * @param {...any} args - Additional arguments
 */
export const devWarn = (message, ...args) => {
  if (isDevelopment) {
    console.warn(message, ...args);
  }
};

/**
 * Sanitize data before logging to remove sensitive information
 * @param {*} data - Data to sanitize
 * @returns {*} - Sanitized data safe for logging
 */
export const sanitizeForLogging = data => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      // eslint-disable-next-line security/detect-object-injection
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      // eslint-disable-next-line security/detect-object-injection
      sanitized[key] = sanitizeForLogging(value);
    } else {
      // eslint-disable-next-line security/detect-object-injection
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Safe logging that sanitizes data and only logs in development
 * @param {string} message - Log message
 * @param {*} data - Data to log (will be sanitized)
 */
export const safeLog = (message, data = null) => {
  if (isDevelopment && data !== null) {
    console.log(message, sanitizeForLogging(data));
  } else if (isDevelopment) {
    console.log(message);
  }
};