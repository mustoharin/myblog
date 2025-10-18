const Role = require('../models/Role');

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required privileges
 * Automatically allows superadmin role to perform any action
 * 
 * @middleware
 * @param {string[]} requiredPrivileges Array of privilege codes required for the action
 * @returns {Function} Express middleware function
 * @throws {401} Authentication required
 * @throws {403} Insufficient privileges
 * @throws {500} Error checking privileges
 * @example
 * // Use in route
 * router.post('/users', auth, checkRole(['create_user']), async (req, res) => {...})
 */
const checkRole = requiredPrivileges => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = req.user;
      const role = await Role.findById(user.role).populate('privileges');
      
      if (!role) {
        return res.status(500).json({ message: 'Error: Role not found' });
      }

      // If it's a superadmin role, allow all actions
      if (role.name === 'superadmin') {
        return next();
      }

      // Check if user's role has all required privileges
      const userPrivilegeCodes = role.privileges.map(p => p.code);
      const hasAllPrivileges = requiredPrivileges.every(privilege => 
        userPrivilegeCodes.includes(privilege));

      if (!hasAllPrivileges) {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Error checking privileges' });
    }
  };
};

module.exports = checkRole;