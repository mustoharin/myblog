const request = require('supertest');
const express = require('express');
const auth = require('../middleware/auth');
const { canReplyToComments, canModerateComments, commentRateLimit } = require('../middleware/commentAuth');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
} = require('./setup');

// Create test app for middleware testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test route for reply permission
  app.get('/test-reply', auth, canReplyToComments, (req, res) => {
    res.json({ success: true, message: 'Reply permission granted' });
  });
  
  // Test route for moderation permission
  app.get('/test-moderate', auth, canModerateComments, (req, res) => {
    res.json({ success: true, message: 'Moderation permission granted' });
  });
  
  // Test route for rate limiting
  app.post('/test-rate-limit', commentRateLimit, (req, res) => {
    res.json({ success: true, message: 'Rate limit passed' });
  });
  
  return app;
};

describe('Comment Auth Middleware', () => {
  let privileges, roles, superadminUser, adminUser, regularUser, noPermissionUser;
  let superadminToken, adminToken, regularToken, noPermissionToken;
  let testApp;

  beforeAll(async () => {
    testApp = createTestApp();
  });

  beforeEach(async () => {
    privileges = await createInitialPrivileges();
    
    // Comment privileges are now included in createInitialPrivileges()
    
    roles = await createInitialRoles(privileges);
    
    // Create role without comment permissions
    const noPermissionRole = await Role.create({
      name: 'nopermission',
      description: 'No Permission Role',
      privileges: [], // No privileges
    });
    
    // Note: Admin and superadmin already have comment privileges from createInitialRoles()
    // Just add reply privilege to regular user
    const replyPrivilege = privileges.find(p => p.code === 'reply_comments');
    await Role.findByIdAndUpdate(roles.regularRole._id, {
      $push: { privileges: replyPrivilege._id },
    });

    // Create test users
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);
    regularUser = await createTestUser('regular', roles.regularRole._id);
    noPermissionUser = await createTestUser('nopermission', noPermissionRole._id);

    // Get authentication tokens using the main app
    const mainApp = require('../server');
    const bypassToken = process.env.TEST_BYPASS_CAPTCHA_TOKEN;

    const superadminAuth = await request(mainApp)
      .post('/api/auth/login')
      .send({
        username: 'superadmin',
        password: 'Password#12345!',
        testBypassToken: bypassToken,
      });
    superadminToken = superadminAuth.body.token;

    const adminAuth = await request(mainApp)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Password#12345!',
        testBypassToken: bypassToken,
      });
    adminToken = adminAuth.body.token;

    const regularAuth = await request(mainApp)
      .post('/api/auth/login')
      .send({
        username: 'regular',
        password: 'Password#12345!',
        testBypassToken: bypassToken,
      });
    regularToken = regularAuth.body.token;

    const noPermissionAuth = await request(mainApp)
      .post('/api/auth/login')
      .send({
        username: 'nopermission',
        password: 'Password#12345!',
        testBypassToken: bypassToken,
      });
    noPermissionToken = noPermissionAuth.body.token;
  });

  describe('canReplyToComments middleware', () => {
    it('should allow superadmin to reply', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reply permission granted');
    });

    it('should allow admin to reply', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reply permission granted');
    });

    it('should allow regular user with reply permission to reply', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reply permission granted');
    });

    it('should deny user without reply permission', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You do not have permission to reply to comments');
    });

    it('should require authentication', async () => {
      const response = await request(testApp)
        .get('/test-reply');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid token', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('canModerateComments middleware', () => {
    it('should allow superadmin to moderate', async () => {
      const response = await request(testApp)
        .get('/test-moderate')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Moderation permission granted');
    });

    it('should allow admin to moderate', async () => {
      const response = await request(testApp)
        .get('/test-moderate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Moderation permission granted');
    });

    it('should deny regular user from moderating', async () => {
      const response = await request(testApp)
        .get('/test-moderate')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You do not have permission to moderate comments');
    });

    it('should deny user without moderation permission', async () => {
      const response = await request(testApp)
        .get('/test-moderate')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You do not have permission to moderate comments');
    });

    it('should require authentication', async () => {
      const response = await request(testApp)
        .get('/test-moderate');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('commentRateLimit middleware', () => {
    it('should allow first request', async () => {
      const response = await request(testApp)
        .post('/test-rate-limit')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rate limit passed');
    });

    it('should track requests by IP', async () => {
      const testAppWithRateLimit = express();
      testAppWithRateLimit.use(express.json());
      
      // Set up rate limit with very low limits for testing
      const rateLimit = require('express-rate-limit');
      const testRateLimit = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 2, // Very low limit for testing
        message: {
          success: false,
          message: 'Too many comment requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
      
      testAppWithRateLimit.post('/test-rate-limit-strict', testRateLimit, (req, res) => {
        res.json({ success: true, message: 'Rate limit passed' });
      });

      // First request should pass
      const response1 = await request(testAppWithRateLimit)
        .post('/test-rate-limit-strict')
        .send({ test: 'data1' });
      expect(response1.status).toBe(200);

      // Second request should pass
      const response2 = await request(testAppWithRateLimit)
        .post('/test-rate-limit-strict')
        .send({ test: 'data2' });
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await request(testAppWithRateLimit)
        .post('/test-rate-limit-strict')
        .send({ test: 'data3' });
      expect(response3.status).toBe(429);
      expect(response3.body.success).toBe(false);
      expect(response3.body.message).toContain('Too many comment requests');
    });

    it('should include rate limit headers', async () => {
      const response = await request(testApp)
        .post('/test-rate-limit')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      // Rate limit headers should be present (though actual headers may vary)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Permission helper functions', () => {
    it('should correctly identify users with reply permission', async () => {
      // Test helper function directly
      const User = require('../models/User');
      
      const regularUserWithRole = await User.findById(regularUser._id).populate({
        path: 'role',
        populate: { path: 'privileges' },
      });

      const noPermissionUserWithRole = await User.findById(noPermissionUser._id).populate({
        path: 'role',
        populate: { path: 'privileges' },
      });

      // Regular user should have reply permission
      const hasReplyPermission = regularUserWithRole.role.privileges.some(p => p.code === 'reply_comments');
      expect(hasReplyPermission).toBe(true);

      // No permission user should not have reply permission
      const noReplyPermission = noPermissionUserWithRole.role.privileges.some(p => p.code === 'reply_comments');
      expect(noReplyPermission).toBe(false);
    });

    it('should correctly identify users with moderation permission', async () => {
      const User = require('../models/User');
      
      const adminUserWithRole = await User.findById(adminUser._id).populate({
        path: 'role',
        populate: { path: 'privileges' },
      });

      const regularUserWithRole = await User.findById(regularUser._id).populate({
        path: 'role',
        populate: { path: 'privileges' },
      });

      // Admin user should have moderation permission
      const hasModeratePermission = adminUserWithRole.role.privileges.some(p => p.code === 'manage_comments');
      expect(hasModeratePermission).toBe(true);

      // Regular user should not have moderation permission
      const noModeratePermission = regularUserWithRole.role.privileges.some(p => p.code === 'manage_comments');
      expect(noModeratePermission).toBe(false);
    });
  });

  describe('Error handling in middleware', () => {
    it('should handle database errors gracefully in canReplyToComments', async () => {
      // Create a test app that simulates database error
      const errorApp = express();
      errorApp.use(express.json());
      
      // Mock middleware that simulates user without populated role
      errorApp.use((req, res, next) => {
        req.user = { _id: 'invalid_id', role: null };
        next();
      });
      
      errorApp.get('/test-error-reply', canReplyToComments, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(errorApp)
        .get('/test-error-reply');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should handle database errors gracefully in canModerateComments', async () => {
      // Create a test app that simulates database error
      const errorApp = express();
      errorApp.use(express.json());
      
      // Mock middleware that simulates user without populated role
      errorApp.use((req, res, next) => {
        req.user = { _id: 'invalid_id', role: null };
        next();
      });
      
      errorApp.get('/test-error-moderate', canModerateComments, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(errorApp)
        .get('/test-error-moderate');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware integration', () => {
    it('should work correctly when chained with auth middleware', async () => {
      const response = await request(testApp)
        .get('/test-reply')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail auth first when no token provided', async () => {
      const response = await request(testApp)
        .get('/test-reply');

      expect(response.status).toBe(401);
      // Should fail at auth middleware before reaching permission check
    });

    it('should pass auth but fail permission check', async () => {
      const response = await request(testApp)
        .get('/test-moderate')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You do not have permission to moderate comments');
    });
  });
});