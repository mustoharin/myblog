/**
 * Mock CAPTCHA implementation for testing
 */
class MockCaptcha {
  constructor() {
    this.mockText = '123456';
    this.sessions = new Map();
    this.usedSessions = new Set();
    this.validToken = null;
    this.validationTokens = new Map(); // Add validationTokens map
  }

  setValidToken(token) {
    if (token) {
      this.validationTokens.set(token, Date.now() + 300000); // 5 minutes expiry
    } else {
      this.validationTokens.clear();
    }
  };

  /**
   * Create a new mock captcha that always returns the same values
   * @returns {Object} Mock captcha session id and image data URL
   */
  createCaptcha() {
    const sessionId = `test-session-${Date.now()}`;
    const expiresIn = process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID ? 5000 : 300000; // 5 seconds in tests, 5 minutes otherwise
    this.sessions.set(sessionId, {
      text: this.mockText,
      expires: Date.now() + expiresIn
    });
    
    return {
      sessionId,
      imageDataUrl: 'data:image/png;base64,mock-image'
    };
  }

  /**
   * Verify captcha text
   * @param {string} sessionId Captcha session ID
   * @param {string} userInput User's captcha input
   * @param {string} token Optional validation token
   * @returns {boolean} Whether the captcha is valid
   */
  validateToken(token) {
    if (process.env.NODE_ENV === 'test') {
      const expiry = this.validationTokens.get(token);
      return expiry && Date.now() <= expiry;
    }

    if (!token || typeof token !== 'string') {
      return false;
    }

    const expiry = this.validationTokens.get(token);
    if (!expiry) {
      return false;
    }

    if (Date.now() > expiry) {
      this.validationTokens.delete(token);
      return false;
    }

    // One-time use tokens
    this.validationTokens.delete(token);
    return true;
  }

  verifyCaptcha(sessionId, userInput) {
    if (process.env.NODE_ENV === 'test') {
      const session = this.sessions.get(sessionId);
      if (!session) return false;
      if (Date.now() > session.expires) {
        this.sessions.delete(sessionId);
        return false;
      }
      const isValid = userInput === '123456';
      if (isValid) {
        if (this.usedSessions.has(sessionId)) {
          return false;
        }
        this.usedSessions.add(sessionId);
      }
      return isValid;
    }

    if (!sessionId || !userInput) {
      return false;
    }

    if (!this.sessions.has(sessionId)) {
      return false;
    }

    if (this.usedSessions.has(sessionId)) {
      return false;
    }

    const session = this.sessions.get(sessionId);
    const currentTime = Date.now();

    if (currentTime > session.expires) {
      this.sessions.delete(sessionId);
      return false;
    }

    const isValid = userInput === this.mockText;

    if (isValid) {
      this.usedSessions.add(sessionId);
    }

    return isValid;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredCaptchas() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expires) {
        this.sessions.delete(sessionId);
        this.usedSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get number of active sessions (for testing)
   */
  getActiveSessions() {
    return this.sessions.size;
  }
}

const mockCaptchaInstance = new MockCaptcha();
mockCaptchaInstance.MockCaptcha = MockCaptcha; // Expose the class

module.exports = mockCaptchaInstance;