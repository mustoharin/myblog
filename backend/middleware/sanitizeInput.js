/**
 * Input sanitization middleware to prevent NoSQL injection attacks
 * Removes MongoDB operators from user input
 */

const sanitizeObject = obj => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove MongoDB operators that could be used for injection
        obj[key] = obj[key].replace(/^\$/, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      req.query = Object.assign({}, req.query);
      sanitizeObject(req.query);
    }
    
    // Sanitize request body
    if (req.body) {
      req.body = Object.assign({}, req.body);
      sanitizeObject(req.body);
    }
    
    // Note: req.params is typically safe as it comes from route definitions
    // but we can log suspicious patterns
    if (req.params) {
      for (const key in req.params) {
        if (typeof req.params[key] === 'string' && req.params[key].includes('$')) {
          console.warn(`Suspicious parameter detected: ${key} = ${req.params[key]}`);
        }
      }
    }
    
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid input format' });
  }
};

module.exports = sanitizeInput;