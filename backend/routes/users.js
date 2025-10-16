const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
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
        populate: { path: 'privileges' }
      }
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
        populate: { path: 'privileges' }
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
 * @requires create_user
 * @param {Object} req.body
 * @param {string} req.body.username Username
 * @param {string} req.body.email Email address
 * @param {string} req.body.password Password
 * @param {string} req.body.role Role ID
 * @returns {Object} Created user object with populated role
 * @throws {400} Missing required fields or duplicate username/email
 * @throws {500} Server Error
 */
router.post('/', auth, checkRole(['create_user']), async (req, res) => {
  try {
    const { username, email, password, role, isActive } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({ 
        message: `${!username ? 'Username' : !email ? 'Email' : !password ? 'Password' : 'Role'} is required` 
      });
    }

    // Check for existing username or email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: `${existingUser.username === username ? 'Username' : 'Email'} already exists`
      });
    }

    // Validate role exists
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Create the new user
    const newUser = new User({
      username,
      email,
      password,  // Will be hashed by mongoose pre-save hook
      role,
      isActive: isActive !== undefined ? isActive : true
    });

    await newUser.save();
    
    const savedUser = await User.findById(newUser._id)
      .select('-password')
      .populate({
        path: 'role',
        populate: { path: 'privileges' }
      });
    
    res.status(201).json(savedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/users/:id
 * @description Update user information with optimistic concurrency control
 * @access Private
 * @requires update_user
 * @param {string} id User ID
 * @param {Object} req.body
 * @param {string} [req.body.username] New username
 * @param {string} [req.body.email] New email
 * @param {string} [req.body.password] New password
 * @param {string} [req.body.role] New role ID
 * @returns {Object} Updated user object with populated role
 * @throws {404} User Not Found
 * @throws {400} Invalid role
 * @throws {409} Concurrent update conflict
 * @throws {500} Server Error
 */
router.put('/:id', auth, checkRole(['update_user']), async (req, res) => {
  let tries = 3; // Maximum number of retries
  
  while (tries > 0) {
    try {
      const { username, email, password, role, isActive } = req.body;
      
      // First get the current user
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Build update data
      const updateData = {};

      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
      if (role) {
        const roleDoc = await Role.findById(role);
        if (!roleDoc) {
          return res.status(400).json({ message: 'Invalid role' });
        }
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
          upsert: false
        }
      )
      .select('-password')
      .populate({
        path: 'role',
        populate: { path: 'privileges' }
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

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
        role: userToDelete.role._id
      });
      if (superadminCount <= 1) {
        return res.status(403).json({ message: 'Cannot delete last superadmin' });
      }
    }

    // Check for existing posts
    const Post = require('../models/Post');
    const postsCount = await Post.countDocuments({ author: userToDelete._id });
    if (postsCount > 0) {
      return res.status(400).json({ message: 'User has existing posts and cannot be deleted' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;