/**
 * Secure error handling middleware
 * Prevents information disclosure in production while maintaining debugging in development
 */

const secureErrorHandler = (err, req, res, _next) => {
  // Log the full error for developers (but not in production logs that might be exposed)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    // In production, log minimal information
    console.error('Error occurred:', {
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Determine error status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Determine error message to send to client
  let message = 'Internal server error';
  
  // Only send specific error messages for client errors (4xx)
  if (statusCode >= 400 && statusCode < 500) {
    message = err.message || 'Bad request';
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    // In development, provide more details
    if (process.env.NODE_ENV === 'development') {
      message = err.message;
    }
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Send error response
  const response = {
    success: false,
    message,
  };
  
  // Only include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

module.exports = secureErrorHandler;