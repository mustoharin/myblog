const request = require('supertest');
const app = require('../server');
const Post = require('../models/Post');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken
} = require('./setup');

describe('Admin Routes', () => {
  let privileges, roles, superadminUser, adminUser, superadminToken, adminToken;

  beforeEach(async () => {
    // Setup initial data
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);

    // Get tokens using proper helper functions that handle CAPTCHA
    superadminToken = await getSuperadminToken(app);
    adminToken = await getAdminToken(app);
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin statistics for superadmin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalPosts');
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalComments');
      expect(typeof response.body.totalPosts).toBe('number');
      expect(typeof response.body.totalUsers).toBe('number');
      expect(typeof response.body.totalViews).toBe('number');
      expect(typeof response.body.totalComments).toBe('number');
    });

    it('should return admin statistics for admin with read privileges', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalPosts');
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalComments');
    });

    it('should return correct user count', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      // Should have at least 2 users (superadmin and admin from setup)
      expect(response.body.totalUsers).toBeGreaterThanOrEqual(2);
    });

    it('should return zero stats when no posts exist', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(0);
      expect(response.body.totalViews).toBe(0);
      expect(response.body.totalComments).toBe(0);
    });

    it('should count posts correctly after creating posts', async () => {
      // Delete any existing posts first
      await Post.deleteMany({});
      
      // Create test posts
      await Post.create({
        title: 'Test Post 1',
        content: 'Content 1',
        excerpt: 'Excerpt 1',
        author: adminUser._id,
        tags: ['test'],
        views: 10,
        comments: []
      });

      await Post.create({
        title: 'Test Post 2',
        content: 'Content 2',
        excerpt: 'Excerpt 2',
        author: adminUser._id,
        tags: ['test'],
        views: 20,
        comments: [
          { content: 'Comment 1', authorName: 'User1' },
          { content: 'Comment 2', authorName: 'User2' }
        ]
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(2);
      expect(response.body.totalViews).toBe(30); // 10 + 20
      expect(response.body.totalComments).toBe(2);
    });

    it('should handle posts with no views', async () => {
      // Delete any existing posts first
      await Post.deleteMany({});
      
      await Post.create({
        title: 'Test Post',
        content: 'Content',
        excerpt: 'Excerpt',
        author: adminUser._id,
        tags: ['test']
        // No views field - should default to 0
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(1);
      expect(response.body.totalViews).toBe(0); // Defaults to 0
    });

    it('should handle posts with no comments', async () => {
      // Delete any existing posts first
      await Post.deleteMany({});
      
      await Post.create({
        title: 'Test Post',
        content: 'Content',
        excerpt: 'Excerpt',
        author: adminUser._id,
        tags: ['test']
        // No comments field
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(1);
      expect(response.body.totalComments).toBe(0);
    });

    it('should aggregate views from multiple posts correctly', async () => {
      // Delete any existing posts first
      await Post.deleteMany({});
      
      await Post.create([
        {
          title: 'Post 1',
          content: 'Content 1',
          excerpt: 'Excerpt 1',
          author: adminUser._id,
          tags: ['test'],
          views: 100
        },
        {
          title: 'Post 2',
          content: 'Content 2',
          excerpt: 'Excerpt 2',
          author: adminUser._id,
          tags: ['test'],
          views: 250
        },
        {
          title: 'Post 3',
          content: 'Content 3',
          excerpt: 'Excerpt 3',
          author: adminUser._id,
          tags: ['test'],
          views: 50
        }
      ]);

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(3);
      expect(response.body.totalViews).toBe(400); // 100 + 250 + 50
    });

    it('should aggregate comments from multiple posts correctly', async () => {
      // Delete any existing posts first
      await Post.deleteMany({});
      
      await Post.create([
        {
          title: 'Post 1',
          content: 'Content 1',
          excerpt: 'Excerpt 1',
          author: adminUser._id,
          tags: ['test'],
          comments: [
            { content: 'Comment 1', authorName: 'User1' },
            { content: 'Comment 2', authorName: 'User2' }
          ]
        },
        {
          title: 'Post 2',
          content: 'Content 2',
          excerpt: 'Excerpt 2',
          author: adminUser._id,
          tags: ['test'],
          comments: [
            { content: 'Comment 3', authorName: 'User3' }
          ]
        },
        {
          title: 'Post 3',
          content: 'Content 3',
          excerpt: 'Excerpt 3',
          author: adminUser._id,
          tags: ['test'],
          comments: []
        }
      ]);

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPosts).toBe(3);
      expect(response.body.totalComments).toBe(3); // 2 + 1 + 0
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(401);
    });

    it('should require appropriate privileges', async () => {
      // Create a user with limited role (no read_post privilege)
      const Role = require('../models/Role');
      const User = require('../models/User');
      
      const limitedRole = await Role.create({
        name: 'limited',
        description: 'Limited Role',
        privileges: [] // No privileges at all
      });

      const limitedUser = await User.create({
        username: 'limited_user',
        email: 'limited@test.com',
        password: 'Password123!',
        role: limitedRole._id
      });

      // Try to login and get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'limited_user',
          password: 'Password123!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      const limitedToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${limitedToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient privileges');
    });
  });
});
