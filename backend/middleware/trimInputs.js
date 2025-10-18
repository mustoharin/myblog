/**
 * Middleware to trim all string values in request body
 * This helps prevent issues with whitespace in form submissions
 */
const trimInputs = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Recursively trim strings in objects
    const trimObject = obj => {
      if (!obj || typeof obj !== 'object') return;
      
      // Use Object.getOwnPropertyNames to avoid prototype pollution
      const keys = Object.getOwnPropertyNames(obj);
      keys.forEach(key => {
        // Additional safety checks
        if (typeof key !== 'string' || key.startsWith('__')) return;
        
        const value = obj[key];
        if (typeof value === 'string') {
          obj[key] = value.trim();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          trimObject(value);
        } else if (Array.isArray(value)) {
          obj[key] = value.map(item => {
            if (typeof item === 'string') {
              return item.trim();
            } else if (item && typeof item === 'object') {
              trimObject(item);
            }
            return item;
          });
        }
      });
    };

    trimObject(req.body);
  }
  next();
};

module.exports = trimInputs;