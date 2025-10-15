/**
 * Middleware to validate CAPTCHA token
 */
const validateCaptcha = async (req, res, next) => {
  try {
    // First check for test bypass token
    if (process.env.TEST_BYPASS_CAPTCHA_TOKEN) {
      console.log('TEST_BYPASS_CAPTCHA_TOKEN is set:', process.env.TEST_BYPASS_CAPTCHA_TOKEN);
      console.log('testBypassToken from request:', req.body.testBypassToken);
      
      if (req.body.testBypassToken === process.env.TEST_BYPASS_CAPTCHA_TOKEN) {
        console.log('Bypass token matched - skipping CAPTCHA validation');
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
    console.error('CAPTCHA validation error:', error);
    res.status(500).json({ message: 'Error validating CAPTCHA' });
  }
};

module.exports = validateCaptcha;