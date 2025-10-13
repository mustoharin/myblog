const xss = require('xss');

// Configuration for XSS filtering
const xssOptions = {
  whiteList: {}, // No tags allowed, strip everything
  stripIgnoreTag: true, // Strip tags not in whitelist
  stripIgnoreTagBody: ['script'], // Strip content of these tags
};

const filter = new xss.FilterXSS(xssOptions);

/**
 * Validates and sanitizes text input against XSS attacks
 * @param {string} value - The input value to validate
 * @returns {boolean} - True if the sanitized value matches the original, false otherwise
 */
function isXssSafe(value) {
  if (typeof value !== 'string') return false;
  const sanitized = filter.process(value);
  return sanitized === value;
}

/**
 * Validates that text input contains no HTML/script tags or suspicious patterns
 * @param {string} value - The input value to validate
 * @returns {string} Error message if invalid, empty string if valid
 */
function validateNoXss(value) {
  if (!isXssSafe(value)) {
    return 'Input contains potentially unsafe content';
  }
  if (/<[^>]*>/.test(value)) {
    return 'HTML tags are not allowed';
  }
  if (/javascript:/i.test(value)) {
    return 'JavaScript protocol is not allowed';
  }
  if (/data:/i.test(value)) {
    return 'Data protocol is not allowed';
  }
  if (/vbscript:/i.test(value)) {
    return 'VBScript protocol is not allowed';
  }
  return '';
}

module.exports = {
  isXssSafe,
  validateNoXss
};