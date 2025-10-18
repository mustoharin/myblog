/**
 * Utility functions for safe object property access to prevent injection attacks
 */

/**
 * Safely get a property from an object using a whitelist of allowed keys
 * @param {object} obj - The object to access
 * @param {string} key - The key to access
 * @param {array} allowedKeys - Array of allowed property names
 * @param {*} defaultValue - Default value if key is not allowed or doesn't exist
 * @returns {*} - The property value or default value
 */
export const safeGet = (obj, key, allowedKeys = [], defaultValue = undefined) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  if (!allowedKeys.includes(key)) return defaultValue;
  // Use hasOwnProperty to safely check property existence
  // eslint-disable-next-line security/detect-object-injection
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : defaultValue;
};

/**
 * Safely set properties on an object using a whitelist of allowed keys
 * @param {object} obj - The object to modify
 * @param {string} key - The key to set
 * @param {*} value - The value to set
 * @param {array} allowedKeys - Array of allowed property names
 * @returns {object} - The modified object
 */
export const safeSet = (obj, key, value, allowedKeys = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (!allowedKeys.includes(key)) return obj;
  
  return {
    ...obj,
    [key]: value,
  };
};

/**
 * Create a safe mapping function that validates keys against a whitelist
 * @param {object} mapping - The mapping object
 * @param {array} allowedKeys - Array of allowed keys
 * @returns {function} - Safe mapping function
 */
export const createSafeMapper = (mapping, allowedKeys = []) => {
  return key => {
    if (!allowedKeys.includes(key)) return undefined;
    // Use hasOwnProperty to safely access mapping properties
    // eslint-disable-next-line security/detect-object-injection
    return Object.prototype.hasOwnProperty.call(mapping, key) ? mapping[key] : undefined;
  };
};

/**
 * Validate that a key is safe for object property access
 * @param {string} key - The key to validate
 * @param {array} allowedKeys - Array of allowed property names
 * @returns {boolean} - True if key is safe
 */
export const isValidKey = (key, allowedKeys = []) => {
  if (typeof key !== 'string') return false;
  if (key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) return false;
  return allowedKeys.includes(key);
};