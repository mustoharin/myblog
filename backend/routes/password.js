const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const passwordValidator = require('../utils/passwordValidator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

/**
 * @route POST /api/password/forgot
 * @description Request password reset email
 * @access Public
 * @param {Object} req.body
 * @param {string} req.body.email User's email address
 * @returns {Object} Success message
 * @throws {400} Email not found
 * @throws {500} Server Error
 */
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No user found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>You have requested to reset your password</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error sending password reset email' });
  }
});

/**
 * @route POST /api/password/reset/:token
 * @description Reset password using token
 * @access Public
 * @param {string} token Reset token
 * @param {Object} req.body
 * @param {string} req.body.password New password
 * @returns {Object} Success message
 * @throws {400} Invalid or expired token
 * @throws {400} Password required
 * @throws {500} Server Error
 */
/**
 * @route POST /api/password/change
 * @description Change password for logged-in user
 * @access Private
 * @param {Object} req.body
 * @param {string} req.body.currentPassword Current password
 * @param {string} req.body.newPassword New password
 * @returns {Object} Success message
 * @throws {400} Invalid current password
 * @throws {400} Invalid new password
 * @throws {500} Server Error
 */
router.post('/change', auth, roleAuth(['change_password']), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; // From auth middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
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

    // Update password and save
    user.password = newPassword;
    try {
      await user.save();
    } catch (error) {
      console.error('Error saving password:', error);
      throw error;
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

router.post('/reset/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Hash token from params
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Validate password after token verification
    const validation = passwordValidator.validate(password);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message,
        requirements: passwordValidator.getRequirements()
      });
    }

    // Set new password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    try {
      await user.save();
    } catch (error) {
      console.error('Error saving password:', error);
      throw error;
    }

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;