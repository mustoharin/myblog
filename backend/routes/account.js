const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const passwordValidator = require('../utils/passwordValidator');

/**
 * @route GET /api/account/profile
 * @description Get current user's profile information
 * @access Private
 * @returns {Object} User profile data
 * @throws {404} User not found
 * @throws {500} Server Error
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'role',
        populate: {
          path: 'privileges'
        }
      })
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
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
        description: user.role.description,
        privileges: user.role.privileges.map(p => ({
          _id: p._id,
          name: p.name,
          code: p.code
        }))
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

/**
 * @route PUT /api/account/profile
 * @description Update current user's profile information
 * @access Private
 * @param {Object} req.body
 * @param {string} req.body.email New email address
 * @param {string} req.body.fullName New full name
 * @returns {Object} Updated user profile
 * @throws {400} Invalid email or data
 * @throws {409} Email already exists
 * @throws {500} Server Error
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { email, fullName } = req.body;
    const userId = req.user._id;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};
    
    // Validate and update email if provided
    if (email && email !== user.email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
      
      updateData.email = email.toLowerCase().trim();
    }

    // Update full name if provided
    if (fullName !== undefined) {
      updateData.fullName = fullName.trim();
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).populate({
      path: 'role',
      populate: {
        path: 'privileges'
      }
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    // Log activity
    await Activity.logActivity(
      'profile_update',
      req.user,
      'user',
      userId,
      {
        email: updateData.email,
        fullName: updateData.fullName
      },
      req
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        isActive: updatedUser.isActive,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        role: {
          _id: updatedUser.role._id,
          name: updatedUser.role.name,
          description: updatedUser.role.description,
          privileges: updatedUser.role.privileges.map(p => ({
            _id: p._id,
            name: p.name,
            code: p.code
          }))
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

/**
 * @route POST /api/account/change-password
 * @description Change current user's password
 * @access Private
 * @param {Object} req.body
 * @param {string} req.body.currentPassword Current password
 * @param {string} req.body.newPassword New password
 * @returns {Object} Success message
 * @throws {400} Invalid current password or new password
 * @throws {500} Server Error
 */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Ensure new password is different from current
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }
    
    // Validate new password
    const validation = passwordValidator.validate(newPassword);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message,
        requirements: passwordValidator.getRequirements()
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log activity
    await Activity.logActivity(
      'password_change',
      req.user,
      'user',
      userId,
      { reason: 'User changed their own password' },
      req
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

module.exports = router;