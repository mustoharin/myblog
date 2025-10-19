const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const captcha = process.env.NODE_ENV === 'test' ? 
  require('../utils/mockCaptcha') :
  require('../utils/captcha');

// Get new captcha route
router.get('/captcha', (req, res) => {
  const { sessionId, imageDataUrl } = captcha.createCaptcha();
  res.json({ 
    sessionId,
    imageDataUrl,
  });
});

// Refresh existing captcha route
router.post('/captcha/refresh', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required' });
  }

  const { sessionId: newSessionId, imageDataUrl } = captcha.createCaptcha(sessionId);
  res.json({ 
    sessionId: newSessionId,
    imageDataUrl,
  });
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaToken, captchaSessionId, captchaText } = req.body;

    // Validate required fields first
    if (!username && !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Check for test bypass token
    const testBypassToken = req.body.testBypassToken;
    const skipCaptcha = process.env.TEST_BYPASS_CAPTCHA_TOKEN && testBypassToken === process.env.TEST_BYPASS_CAPTCHA_TOKEN;

    if (!skipCaptcha) {
      // Validate CAPTCHA after username/password checks
      if (!captchaToken && (!captchaSessionId || !captchaText)) {
        return res.status(400).json({ message: 'CAPTCHA verification required' });
      }

      // Try token-based validation first
      if (captchaToken) {
        const isValid = await captcha.validateToken(captchaToken);
        if (!isValid) {
          return res.status(400).json({ message: 'Invalid CAPTCHA' });
        }
      } else {
        // Fall back to session-based validation
        const isCaptchaValid = await captcha.verifyCaptcha(captchaSessionId, captchaText);
        if (!isCaptchaValid) {
          return res.status(400).json({ message: 'Invalid CAPTCHA' });
        }
      }
    }

    // Find user by username and populate role with privileges
    const user = await User.findOne({ username }).populate({
      path: 'role',
      populate: {
        path: 'privileges',
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact the administrator.', 
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    
    // Return user data with populated role
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        role: {
          _id: user.role._id,
          name: user.role.name,
          privileges: user.role.privileges.map(p => ({
            _id: p._id,
            name: p.name,
            code: p.code,
          })),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid authorization format' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'privileges',
        },
      });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        role: {
          _id: user.role._id,
          name: user.role.name,
          privileges: user.role.privileges.map(p => ({
            _id: p._id,
            name: p.name,
            code: p.code,
          })),
        },
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  try {
    // For JWT-based auth, logout is handled client-side by removing the token
    // We can optionally log the logout activity here if needed
    
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error during logout' 
    });
  }
});

module.exports = router;