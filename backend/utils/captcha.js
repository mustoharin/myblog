const crypto = require('crypto');
const { createCanvas } = require('canvas');

class Captcha {
  constructor() {
    this.captchaStore = new Map(); // Store captcha in memory (replace with Redis in production)
    this.validationTokens = new Map(); // Store validation tokens
    this.width = 150;
    this.height = 50;
  }

  /**
   * Generate a random string of numbers and letters
   * @param {number} length Length of the captcha string
   * @returns {string} Random string
   */
  generateCaptchaText(length = 6) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars like 0,1,I,O
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Generate random noise points
   * @param {CanvasRenderingContext2D} ctx Canvas context
   */
  addNoise(ctx) {
    const noiseCount = this.width * this.height / 100;
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * Add random lines to the image
   * @param {CanvasRenderingContext2D} ctx Canvas context
   */
  addLines(ctx) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
      ctx.lineWidth = Math.random() * 2;
      ctx.moveTo(Math.random() * this.width, Math.random() * this.height);
      ctx.lineTo(Math.random() * this.width, Math.random() * this.height);
      ctx.stroke();
    }
  }

  /**
   * Create a new captcha
   * @returns {Object} Captcha session id and image data URL
   */
  createCaptcha() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const captchaText = this.generateCaptchaText();
    
    // Create canvas
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.width, this.height);

    // Add noise and lines
    this.addNoise(ctx);
    this.addLines(ctx);

    // Add text
    const fontSize = 30;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#333';
    
    // Add each character with random rotation and position
    const textWidth = ctx.measureText(captchaText).width;
    const startX = (this.width - textWidth) / 2;
    
    for (let i = 0; i < captchaText.length; i++) {
      const x = startX + (i * (textWidth / captchaText.length));
      const y = this.height / 2 + (Math.random() * 10 - 5);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() * 0.4) - 0.2); // Random rotation ±0.2 radians
      ctx.fillText(captchaText[i], 0, 0);
      ctx.restore();
    }
    
    // Store captcha with 5 minutes expiry
    this.captchaStore.set(sessionId, {
      text: captchaText,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Clean up expired captchas
    this.cleanupExpiredCaptchas();

    return {
      sessionId,
      imageDataUrl: canvas.toDataURL('image/png')
    };
  }

  /**
   * Verify captcha text or validation token
   * @param {string} sessionId Captcha session ID
   * @param {string} userInput User's captcha input
   * @param {string} [token] Optional validation token
   * @returns {boolean} Whether the captcha is valid
   */
  verifyCaptcha(sessionId, userInput, token) {
    // Try token validation first if provided
    if (token && this.validateToken(token)) {
      return true;
    }

    // Fall back to session-based validation
    if (!sessionId || !userInput) {
      return false;
    }

    const captcha = this.captchaStore.get(sessionId);
    
    if (!captcha) {
      return false; // Session not found
    }

    if (Date.now() > captcha.expiresAt) {
      this.captchaStore.delete(sessionId);
      return false; // Expired
    }

    // Delete after use (one-time use)
    this.captchaStore.delete(sessionId);

    return captcha.text.toLowerCase() === userInput.toLowerCase();
  }

  /**
   * Clean up expired captchas
   */
  cleanupExpiredCaptchas() {
    const now = Date.now();
    
    // Clean up expired captchas
    for (const [sessionId, captcha] of this.captchaStore.entries()) {
      if (now > captcha.expiresAt) {
        this.captchaStore.delete(sessionId);
      }
    }
    
    // Clean up expired tokens
    for (const [token, expiry] of this.validationTokens.entries()) {
      if (now > expiry) {
        this.validationTokens.delete(token);
      }
    }
  }

  /**
   * Validate a token from a trusted source
   * @param {string} token The validation token to verify
   * @returns {boolean} Whether the token is valid
   */
  validateToken(token) {
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

  /**
   * Generate a new validation token (for trusted sources)
   * @param {number} expiryMs Token expiry time in milliseconds (default 5 minutes)
   * @returns {string} The generated token
   */
  generateValidationToken(expiryMs = 5 * 60 * 1000) {
    const token = crypto.randomBytes(32).toString('hex');
    this.validationTokens.set(token, Date.now() + expiryMs);
    return token;
  }
}

const mockCaptcha = require('./mockCaptcha');

module.exports = process.env.NODE_ENV === 'test' ? mockCaptcha : new Captcha();