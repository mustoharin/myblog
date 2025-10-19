const Comment = require('../models/Comment');

// Middleware to check if user can reply to comments
const canReplyToComments = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to reply to comments'
      });
    }
    
    // Check if user has reply permission
    const canReply = user.role && (
      user.role.name === 'admin' || 
      user.role.name === 'superadmin' ||
      (user.role.privileges && user.role.privileges.some(p => p.code === 'reply_comments'))
    );
    
    if (!canReply) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reply to comments'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking comment permissions',
      error: error.message
    });
  }
};

// Middleware to check if user can moderate comments
const canModerateComments = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has admin role or comment moderation privilege
    const canModerate = user.role && (
      user.role.name === 'admin' || 
      user.role.name === 'superadmin' ||
      (user.role.privileges && user.role.privileges.some(p => p.code === 'manage_comments'))
    );
    
    if (!canModerate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to moderate comments'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking moderation permissions',
      error: error.message
    });
  }
};

// Optional middleware for rate limiting comment submissions
const commentRateLimit = (req, res, next) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // Get IP address
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Simple in-memory rate limiting (in production, use Redis)
  if (!global.commentSubmissions) {
    global.commentSubmissions = new Map();
  }
  
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxComments = 5; // Max 5 comments per 10 minutes per IP
  
  const submissions = global.commentSubmissions.get(clientIP) || [];
  const recentSubmissions = submissions.filter(time => now - time < windowMs);
  
  if (recentSubmissions.length >= maxComments) {
    return res.status(429).json({
      success: false,
      message: 'Too many comments submitted. Please wait before commenting again.'
    });
  }
  
  // Add current submission
  recentSubmissions.push(now);
  global.commentSubmissions.set(clientIP, recentSubmissions);
  
  next();
};

module.exports = {
  canReplyToComments,
  canModerateComments,
  commentRateLimit
};