/**
 * Password validation utility based on NIST SP 800-63B and OWASP guidelines
 */
class PasswordValidator {
  constructor() {
    this.minLength = 12;
    this.maxLength = 128; // NIST recommends allowing very long passwords
  }

  /**
   * Validate password against security rules
   * @param {string} password Password to validate
   * @returns {Object} Validation result with success status and error message
   */
  validate(password) {
    if (!password) {
      return {
        isValid: false,
        message: 'Password is required'
      };
    }

    // Check length
    if (password.length < this.minLength) {
      return {
        isValid: false,
        message: `Password must be at least ${this.minLength} characters long`
      };
    }

    if (password.length > this.maxLength) {
      return {
        isValid: false,
        message: `Password cannot be longer than ${this.maxLength} characters`
      };
    }

    // Check for common patterns
    const commonPatterns = [
      'password',
      '123456',
      'qwerty',
      'admin',
      'letmein',
      'welcome'
    ];

    if (commonPatterns.some(pattern => 
      password.toLowerCase().includes(pattern))) {
      return {
        isValid: false,
        message: 'Password contains common patterns that are easily guessed'
      };
    }

    // Check character variety
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const varietyCount = [
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChars
    ].filter(Boolean).length;

    if (varietyCount < 3) {
      return {
        isValid: false,
        message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters'
      };
    }

    // Check for repeating characters
    if (/(.)\1{2,}/.test(password)) {
      return {
        isValid: false,
        message: 'Password cannot contain repeating characters (3 or more times in a row)'
      };
    }

    // Check for sequential characters
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i < sequence.length - 2; i++) {
        const seq = sequence.slice(i, i + 3);
        if (password.includes(seq) || 
            password.includes(seq.split('').reverse().join(''))) {
          return {
            isValid: false,
            message: 'Password cannot contain sequential characters (e.g., abc, 123, cba)'
          };
        }
      }
    }

    return {
      isValid: true,
      message: 'Password meets all requirements'
    };
  }

  /**
   * Get password requirements as a formatted string
   * @returns {string} Password requirements
   */
  getRequirements() {
    return `Password must:
- Be ${this.minLength}-${this.maxLength} characters long
- Contain at least 3 of the following:
  * Uppercase letters (A-Z)
  * Lowercase letters (a-z)
  * Numbers (0-9)
  * Special characters (!@#$%^&*(),.?":{}|<>)
- Not contain common patterns or words
- Not contain repeating characters (3 or more times)
- Not contain sequential characters (e.g., abc, 123, cba)`;
  }
}

module.exports = new PasswordValidator();