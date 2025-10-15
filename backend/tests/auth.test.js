const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  hasRequiredPrivileges
} = require('./setup');
const captcha = require('../utils/captcha');

// Using mockCaptcha in test environment

describe('Auth Routes', () => {
  let privileges, roles, superadminUser, adminUser;

  beforeEach(async () => {
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      // Set up test environment
      process.env.TEST_BYPASS_CAPTCHA_TOKEN = 'e2e_test_bypass_captcha_2025';
    });

    it('should login successfully with test bypass token', async () => {
      // Verify the bypass token is set in the environment
      const bypassToken = process.env.TEST_BYPASS_CAPTCHA_TOKEN;
      console.log('Bypass token from env:', bypassToken);
      expect(bypassToken).toBe('e2e_test_bypass_captcha_2025');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          testBypassToken: bypassToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('superadmin');
    });

    it('should login successfully with superadmin credentials', async () => {
      // First get a CAPTCHA
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');
      
      expect(captchaResponse.status).toBe(200);
      expect(captchaResponse.body).toHaveProperty('sessionId');
      
      // Now try to login with the CAPTCHA
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          captchaText: '123456', // Mock captcha input
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('superadmin');
    });

    it('should fail with invalid test bypass token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          testBypassToken: 'invalid-bypass-token'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('CAPTCHA verification required');
    });

    it('should login successfully with admin credentials', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
    });

    it('should fail with invalid password', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'wrongpassword',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail with missing username', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username is required');
    });

    it('should fail with missing password', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Password is required');
    });

    it('should fail with empty string credentials', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '',
          password: '',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username and password are required');
    });

    it('should return proper user data structure', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'superadmin');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user.role).toHaveProperty('privileges');
      expect(Array.isArray(response.body.user.role.privileges)).toBe(true);
    });
  });

  describe('Auth Token Validation', () => {
    let validToken;

    beforeEach(async () => {
      // Get a valid token first
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });
      validToken = loginResponse.body.token;
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'InvalidToken');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid authorization format');
    });

    it('should reject requests with missing token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Token ${validToken}`); // Wrong prefix

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid authorization format');
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('Last Login Tracking', () => {
    it('should update lastLogin timestamp on successful login', async () => {
      const User = require('../models/User');
      
      // Get user before login
      const userBefore = await User.findOne({ username: 'superadmin' });
      const lastLoginBefore = userBefore.lastLogin;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      expect(response.status).toBe(200);
      
      // Get user after login
      const userAfter = await User.findOne({ username: 'superadmin' });
      const lastLoginAfter = userAfter.lastLogin;
      
      // Verify lastLogin was updated
      expect(lastLoginAfter).not.toBeNull();
      if (lastLoginBefore) {
        expect(new Date(lastLoginAfter).getTime()).toBeGreaterThan(new Date(lastLoginBefore).getTime());
      }
    });

    it('should not update lastLogin on failed login', async () => {
      const User = require('../models/User');
      
      // Get user before login attempt
      const userBefore = await User.findOne({ username: 'superadmin' });
      const lastLoginBefore = userBefore.lastLogin;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'WrongPassword123!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      expect(response.status).toBe(401);
      
      // Get user after failed login
      const userAfter = await User.findOne({ username: 'superadmin' });
      const lastLoginAfter = userAfter.lastLogin;
      
      // Verify lastLogin was NOT updated
      if (lastLoginBefore) {
        expect(new Date(lastLoginAfter).getTime()).toBe(new Date(lastLoginBefore).getTime());
      } else {
        expect(lastLoginAfter).toBe(lastLoginBefore);
      }
    });

    it('should include lastLogin in user list endpoint', async () => {
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      // Login to update lastLogin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'superadmin',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId
        });

      const token = loginResponse.body.token;

      // Get users list
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      
      // Find the superadmin user
      const superadmin = response.body.items.find(u => u.username === 'superadmin');
      expect(superadmin).toBeDefined();
      expect(superadmin).toHaveProperty('lastLogin');
      expect(superadmin.lastLogin).not.toBeNull();
    });

    it('should track multiple logins with different timestamps', async () => {
      const User = require('../models/User');
      
      // First login
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'Password#12345!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });
      
      const userAfterFirst = await User.findOne({ username: 'admin' });
      const firstLogin = userAfterFirst.lastLogin;
      expect(firstLogin).not.toBeNull();
      
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Second login
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'Password#12345!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });
      
      const userAfterSecond = await User.findOne({ username: 'admin' });
      const secondLogin = userAfterSecond.lastLogin;
      
      // Verify second login timestamp is later
      expect(new Date(secondLogin).getTime()).toBeGreaterThan(new Date(firstLogin).getTime());
    });
  });
});
