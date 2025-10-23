/**
 * Middleware to validate CAPTCHA token
 */
const validateCaptcha = async (req, res, next) => {
  try {
    // First check for test bypass token
    if (process.env.TEST_BYPASS_CAPTCHA_TOKEN) {
      if (req.body.testBypassToken === process.env.TEST_BYPASS_CAPTCHA_TOKEN) {
        return next();
      }
    }

    // Regular CAPTCHA validation
    const { captchaToken, captchaSessionId, captchaText } = req.body;
    const captcha = require('../utils/captcha');

    // Try token-based validation first
    if (captchaToken) {
      if (await captcha.validateToken(captchaToken)) {
        return next();
      }
      return res.status(400).json({ message: 'Invalid CAPTCHA' });
    }

    // Fall back to session-based validation
    if (!captchaSessionId || !captchaText) {
      return res.status(400).json({ message: 'CAPTCHA verification required' });
    }

    const isValid = await captcha.verifyCaptcha(captchaSessionId, captchaText);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid CAPTCHA' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error validating CAPTCHA' });
  }
};

module.exports = validateCaptcha;