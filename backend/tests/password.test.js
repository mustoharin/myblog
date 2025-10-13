const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser
} = require('./setup');

// Mock the email sending functionality
jest.mock('../utils/email');

describe('Password Reset Routes', () => {
  let userForReset, privileges, roles;

  beforeEach(async () => {
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    userForReset = await createTestUser('resetuser', roles.regularRole._id);
  });

  describe('POST /api/password/forgot', () => {
    it('should return 400 if email is not provided', async () => {
      const res = await request(app)
        .post('/api/password/forgot')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email is required');
    });

    it('should return 400 if user is not found', async () => {
      const res = await request(app)
        .post('/api/password/forgot')
        .send({ email: 'nonexistent@example.com' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No user found with this email');
    });

    it('should send reset email and update user reset token', async () => {
      sendEmail.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/password/forgot')
        .send({ email: userForReset.email });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset email sent');
      
      // Verify user was updated with reset token
      const updatedUser = await User.findById(userForReset._id);
      expect(updatedUser.resetPasswordToken).toBeTruthy();
      expect(updatedUser.resetPasswordExpires).toBeTruthy();
      expect(updatedUser.resetPasswordExpires).toBeInstanceOf(Date);
      
      // Verify email was sent
      expect(sendEmail).toHaveBeenCalled();
      const emailCall = sendEmail.mock.calls[0][0];
      expect(emailCall.to).toBe(userForReset.email);
      expect(emailCall.subject).toBe('Password Reset Request');
      expect(emailCall.html).toContain('reset your password');
    });
  });

  describe('POST /api/password/reset/:token', () => {
    let resetToken;
    let hashedToken;

    beforeEach(async () => {
      // Generate and save a valid reset token
      resetToken = require('crypto').randomBytes(32).toString('hex');
      hashedToken = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      userForReset.resetPasswordToken = hashedToken;
      userForReset.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
      await userForReset.save();

      // Verify token was saved
      const savedUser = await User.findById(userForReset._id);
      if (!savedUser || savedUser.resetPasswordToken !== hashedToken) {
        throw new Error('Failed to save reset token');
      }
    });

    it('should return 400 if password is not provided', async () => {
      const res = await request(app)
        .post(`/api/password/reset/${resetToken}`)
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password is required');
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post(`/api/password/reset/${resetToken}`)
        .send({ password: 'short' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password must be at least 12 characters long');
    });

    it('should return 400 if password is not complex enough', async () => {
      const res = await request(app)
        .post(`/api/password/reset/${resetToken}`)
        .send({ password: 'password123456' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password contains common patterns that are easily guessed');
    });

    it('should return 400 if reset token is invalid', async () => {
      const res = await request(app)
        .post('/api/password/reset/invalidtoken')
        .send({ password: 'P@ssw0rd#9x4Q!' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });

    it('should reset password with valid token and password', async () => {
      // Get the user before reset to verify ID
      const beforeUser = await User.findById(userForReset._id);
      expect(beforeUser).toBeTruthy();
      
      const newPassword = 'P@ssw0rd#9x4Q!';
      
      const res = await request(app)
        .post(`/api/password/reset/${resetToken}`)
        .send({ password: newPassword });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password has been reset');
      
      // Verify password was updated on the same user
      const updatedUser = await User.findById(beforeUser._id);
      expect(updatedUser.resetPasswordToken).toBeNull();
      expect(updatedUser.resetPasswordExpires).toBeNull();
      
      // Verify new password works by testing login
      // Wait a short time for MongoDB to finish the write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: userForReset.username,
          password: newPassword,
          captchaToken: 'valid-token'
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeTruthy();
    });

    it('should return 400 if reset token has expired', async () => {
      // Create a new user for this test to avoid affecting other tests
      const expiredUser = await createTestUser('expireduser', roles.regularRole._id);
      
      // Create a token that's already expired
      const expiredToken = require('crypto').randomBytes(32).toString('hex');
      const expiredTokenHash = require('crypto')
        .createHash('sha256')
        .update(expiredToken)
        .digest('hex');
      
      expiredUser.resetPasswordToken = expiredTokenHash;
      expiredUser.resetPasswordExpires = Date.now() - 3600000; // 1 hour ago
      await expiredUser.save();

      const res = await request(app)
        .post(`/api/password/reset/${expiredToken}`)
        .send({ password: 'P@ssw0rd#9x4Q!' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });
  });
});