const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and adds user object to request
 * 
 * @middleware
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 * @throws {401} No token provided
 * @throws {401} Invalid authorization format
 * @throws {401} Invalid token
 * @throws {401} User not found
 * @throws {401} User role not found
 */
const auth = async (req, res, next) => {
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
    try {
      const user = await User.findById(decoded.userId)
        .populate({
          path: 'role',
          populate: {
            path: 'privileges',
            model: 'Privilege'
          }
        });
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.role) {
        return res.status(401).json({ message: 'User role not found' });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({ 
          message: 'Your account has been deactivated. Please contact the administrator.' 
        });
      }
      
      req.user = user;
      next();
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;