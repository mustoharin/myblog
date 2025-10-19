/**
 * Secure token management utilities
 */

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Securely store authentication token
 * @param {string} token - JWT token to store
 */
export const setAuthToken = token => {
  if (!token || typeof token !== 'string') {
    console.warn('Invalid token provided to setAuthToken');
    return;
  }
  
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
};

/**
 * Securely retrieve authentication token
 * @returns {string|null} - Retrieved token or null if not found
 */
export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
};

/**
 * Securely remove authentication token
 */
export const removeAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove auth token:', error);
  }
};

/**
 * Securely store user data
 * @param {object} userData - User data to store
 */
export const setUserData = userData => {
  if (!userData || typeof userData !== 'object') {
    console.warn('Invalid user data provided to setUserData');
    return;
  }
  
  try {
    // Remove sensitive fields before storing
    const safeUserData = {
      _id: userData._id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email,
      roles: userData.roles,
      isActive: userData.isActive,
      // Don't store passwords, tokens, or other sensitive data
    };
    
    localStorage.setItem(USER_KEY, JSON.stringify(safeUserData));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
};

/**
 * Securely retrieve user data
 * @returns {object|null} - Retrieved user data or null if not found
 */
export const getUserData = () => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
};

/**
 * Securely remove user data
 */
export const removeUserData = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to remove user data:', error);
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  removeAuthToken();
  removeUserData();
  
  // Clear any temporary message storage
  try {
    localStorage.removeItem('deactivationMessage');
  } catch (error) {
    console.error('Failed to clear temporary messages:', error);
  }
};

/**
 * Validate if token exists and appears to be a valid JWT structure
 * @param {string} token - Token to validate
 * @returns {boolean} - True if token appears valid
 */
export const isValidTokenStructure = token => {
  if (!token || typeof token !== 'string') return false;
  
  // Basic JWT structure validation (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};