/**
 * Middleware to trim all string values in request body
 * This helps prevent issues with whitespace in form submissions
 */
const trimInputs = (req, res, next) => {
  if (req.body) {
    // Recursively trim strings in objects
    const trimObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].trim();
        } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          trimObject(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map(item => {
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