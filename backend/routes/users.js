const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');

/**
 * @route GET /api/users
 * @description Get all users
 * @access Private
 * @requires read_user
 * @returns {Object[]} Array of user objects with populated role and privileges
 * @throws {500} Server Error
 */
router.get('/', auth, checkRole(['read_user']), async (req, res) => {
  try {
    const paginateResults = require('../utils/pagination');
    const { page, limit, sort = '-createdAt' } = req.query;

    const result = await paginateResults(User, {}, {
      page,
      limit,
      sort,
      select: '-password',
      populate: {
        path: 'role',
        populate: { path: 'privileges' },
      },
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/users/:id
 * @description Get user by ID
 * @access Private
 * @requires read_user
 * @param {string} id User ID
 * @returns {Object} User object with populated role and privileges
 * @throws {404} User Not Found
 * @throws {500} Server Error
 */
router.get('/:id', auth, checkRole(['read_user']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'role',
        populate: { path: 'privileges' },
      });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/users
 * @description Create a new user
 * @access Private
 * @requires create_user (and manage_user_roles for superadmin role assignment)
 * @param {Object} req.body
 * @param {string} req.body.username Username
 * @param {string} req.body.email Email address
 * @param {string} req.body.password Password
 * @param {string} req.body.role Role ID
 * @returns {Object} Created user object with populated role
 * @throws {400} Missing required fields or duplicate username/email
 * @throws {403} Insufficient privileges to assign role
 * @throws {500} Server Error
 */
router.post('/', auth, checkRole(['create_user']), async (req, res) => {
  try {
    const { username, fullName, email, password, role, isActive } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({ 
        message: `${!username ? 'Username' : !email ? 'Email' : !password ? 'Password' : 'Role'} is required`, 
      });
    }

    // Check for existing username or email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: `${existingUser.username === username ? 'Username' : 'Email'} already exists`,
      });
    }

    // Validate role exists
    const roleDoc = await Role.findById(role).populate('privileges');
    if (!roleDoc) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if assigning superadmin role - requires manage_user_roles privilege
    if (roleDoc.name === 'superadmin') {
      // Check if user has manage_user_roles privilege
      const userPrivileges = req.user.role?.privileges || [];
      const hasManageRoles = userPrivileges.some(p => p.code === 'manage_user_roles');
      
      if (!hasManageRoles) {
        return res.status(403).json({ 
          message: 'Insufficient privileges to assign superadmin role',
        });
      }
    }

    // Create the new user
    const newUser = new User({
      username,
      fullName: fullName || null,
      email,
      password,  // Will be hashed by mongoose pre-save hook
      role,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newUser.save();
    
    const savedUser = await User.findById(newUser._id)
      .select('-password')
      .populate({
        path: 'role',
        populate: { path: 'privileges' },
      });
    
    // Log activity
    await Activity.logActivity(
      'user_create',
      req.user,
      'user',
      savedUser._id,
      {
        username: savedUser.username,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: roleDoc.name,
      },
      req,
    );
    
    res.status(201).json(savedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/users/:id
 * @description Update user information with optimistic concurrency control
 * @access Private
 * @requires update_user (and manage_user_roles for role changes)
 * @param {string} id User ID
 * @param {Object} req.body
 * @param {string} [req.body.username] New username
 * @param {string} [req.body.email] New email
 * @param {string} [req.body.password] New password
 * @param {string} [req.body.role] New role ID
 * @returns {Object} Updated user object with populated role
 * @throws {403} Cannot modify own role or insufficient privileges for role change
 * @throws {404} User Not Found
 * @throws {400} Invalid role
 * @throws {409} Concurrent update conflict
 * @throws {500} Server Error
 */
router.put('/:id', auth, checkRole(['update_user']), async (req, res) => {
  let tries = 3; // Maximum number of retries
  
  while (tries > 0) {
    try {
      const { username, fullName, email, password, role, isActive } = req.body;
      
      // First get the current user
      const user = await User.findById(req.params.id).populate({
        path: 'role',
        populate: { path: 'privileges' },
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if trying to modify role
      if (role && role !== user.role._id.toString()) {
        // Prevent users from modifying their own role
        if (req.params.id === req.user.id) {
          return res.status(403).json({ 
            message: 'Cannot modify your own role',
          });
        }

        // Check if user has manage_user_roles privilege
        const userPrivileges = req.user.role?.privileges || [];
        const hasManageRoles = userPrivileges.some(p => p.code === 'manage_user_roles');
        
        if (!hasManageRoles) {
          return res.status(403).json({ 
            message: 'Insufficient privileges to modify user roles',
          });
        }

        // Validate the new role exists
        const roleDoc = await Role.findById(role).populate('privileges');
        if (!roleDoc) {
          return res.status(400).json({ message: 'Invalid role' });
        }

        // Prevent assigning superadmin role without proper privileges
        if (roleDoc.name === 'superadmin' && !hasManageRoles) {
          return res.status(403).json({ 
            message: 'Insufficient privileges to assign superadmin role',
          });
        }
      }

      // Prevent users from deactivating themselves
      if (isActive === false && req.params.id === req.user.id) {
        return res.status(403).json({ 
          message: 'Cannot deactivate your own account',
        });
      }

      // Build update data
      const updateData = {};

      if (username) updateData.username = username;
      if (fullName !== undefined) updateData.fullName = fullName || null;
      if (email) updateData.email = email;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
      if (role) {
        updateData.role = role;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      // Use findOneAndUpdate with optimistic concurrency control
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.params.id },
        { $set: updateData },
        { 
          new: true,
          runValidators: true,
          upsert: false,
        },
      )
        .select('-password')
        .populate({
          path: 'role',
          populate: { path: 'privileges' },
        });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log activity
      await Activity.logActivity(
        'user_update',
        req.user,
        'user',
        updatedUser._id,
        {
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role?.name,
        },
        req,
      );

      res.json(updatedUser);
      return; // Successfully updated, exit the retry loop
    } catch (error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        tries--;
        if (tries === 0) {
          return res.status(409).json({ message: 'Concurrent update conflict' });
        }
        continue; // Retry the update
      }
      res.status(500).json({ message: 'Server error' });
      return;
    }
  }

  res.status(500).json({ message: 'Failed to update user after retries' });
});

/**
 * @route DELETE /api/users/:id
 * @description Delete a user. Cannot delete last superadmin or users with existing posts.
 * @access Private
 * @requires delete_user
 * @param {string} id User ID
 * @returns {undefined} 204 No Content
 * @throws {404} User Not Found
 * @throws {403} Cannot delete last superadmin
 * @throws {400} User has existing posts
 * @throws {500} Server Error
 */
router.delete('/:id', auth, checkRole(['delete_user']), async (req, res) => {
  try {
    // Check if trying to delete last superadmin
    const userToDelete = await User.findById(req.params.id).populate('role');
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for superadmin
    if (userToDelete.role.name === 'superadmin') {
      const superadminCount = await User.countDocuments({
        role: userToDelete.role._id,
      });
      if (superadminCount <= 1) {
        return res.status(403).json({ message: 'Cannot delete last superadmin' });
      }
    }

    // Check for existing posts - with soft delete, we don't need to prevent user deletion
    // const Post = require('../models/Post');
    // const postsCount = await Post.countDocuments({ author: userToDelete._id });
    // if (postsCount > 0) {
    //   return res.status(400).json({ message: 'User has existing posts and cannot be deleted' });
    // }

    // Log activity before deletion
    await Activity.logActivity(
      'user_delete',
      req.user,
      'user',
      userToDelete._id,
      {
        username: userToDelete.username,
        fullName: userToDelete.fullName,
        email: userToDelete.email,
        role: userToDelete.role?.name,
      },
      req,
    );

    await userToDelete.softDelete();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;