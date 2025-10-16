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

  describe('GET /api/admin/posts/popular', () => {
    it('should return popular posts sorted by views', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      // Create test posts with different view counts
      await Post.create([
        {
          title: 'Most Popular Post',
          content: 'Content 1',
          excerpt: 'Excerpt 1',
          author: superadminUser._id,
          isPublished: true,
          views: 100
        },
        {
          title: 'Second Popular Post',
          content: 'Content 2',
          excerpt: 'Excerpt 2',
          author: superadminUser._id,
          isPublished: true,
          views: 50
        },
        {
          title: 'Third Popular Post',
          content: 'Content 3',
          excerpt: 'Excerpt 3',
          author: superadminUser._id,
          isPublished: true,
          views: 25
        }
      ]);

      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(3);
      
      // Check sorting by views (descending)
      expect(response.body.posts[0].title).toBe('Most Popular Post');
      expect(response.body.posts[0].views).toBe(100);
      expect(response.body.posts[1].views).toBe(50);
      expect(response.body.posts[2].views).toBe(25);
    });

    it('should include correct post data fields', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      await Post.create({
        title: 'Test Post',
        content: 'Test Content',
        excerpt: 'Test Excerpt',
        author: superadminUser._id,
        isPublished: true,
        views: 10,
        comments: [
          { content: 'Comment 1', author: superadminUser._id },
          { content: 'Comment 2', author: superadminUser._id }
        ]
      });

      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBeGreaterThan(0);
      
      const post = response.body.posts[0];
      expect(post).toHaveProperty('_id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('views');
      expect(post).toHaveProperty('commentsCount');
      expect(post).toHaveProperty('sharesCount');
      expect(post).toHaveProperty('status');
      expect(post.commentsCount).toBe(2);
      expect(post.status).toBe('published');
    });

    it('should respect limit parameter', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      // Create 10 posts
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `Post ${i + 1}`,
        content: `Content ${i + 1}`,
        excerpt: `Excerpt ${i + 1}`,
        author: superadminUser._id,
        isPublished: true,
        views: 10 - i // Descending views
      }));
      await Post.create(posts);

      const response = await request(app)
        .get('/api/admin/posts/popular?limit=5')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBe(5);
    });

    it('should filter by timeframe', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      const now = new Date();
      const recentTime = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const oldTime = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      // Create posts from different time periods
      await Post.create([
        {
          title: 'Recent Post',
          content: 'Content',
          excerpt: 'Excerpt',
          author: superadminUser._id,
          isPublished: true,
          views: 100,
          createdAt: recentTime
        },
        {
          title: 'Old Post',
          content: 'Content',
          excerpt: 'Excerpt',
          author: superadminUser._id,
          isPublished: true,
          views: 200,
          createdAt: oldTime
        }
      ]);

      const response = await request(app)
        .get('/api/admin/posts/popular?timeframe=day')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBe(1);
      expect(response.body.posts[0].title).toBe('Recent Post');
    });

    it('should include both published and draft posts', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      await Post.create([
        {
          title: 'Published Post',
          content: 'Content',
          excerpt: 'Excerpt',
          author: superadminUser._id,
          isPublished: true,
          views: 50
        },
        {
          title: 'Draft Post',
          content: 'Content',
          excerpt: 'Excerpt',
          author: superadminUser._id,
          isPublished: false,
          views: 100
        }
      ]);

      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBe(2);
      expect(response.body.posts[0].title).toBe('Draft Post');
      expect(response.body.posts[0].status).toBe('draft');
      expect(response.body.posts[1].status).toBe('published');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/posts/popular');

      expect(response.status).toBe(401);
    });

    it('should require read_post privilege', async () => {
      // Create a user with limited role (no read_post privilege)
      const Role = require('../models/Role');
      const User = require('../models/User');
      
      const limitedRole = await Role.create({
        name: 'limited_popular',
        description: 'Limited Role',
        privileges: []
      });

      const limitedUser = await User.create({
        username: 'limited_popular_user',
        email: 'limited_popular@test.com',
        password: 'Password123!',
        role: limitedRole._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'limited_popular_user',
          password: 'Password123!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      const limitedToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${limitedToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle empty database', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toEqual([]);
    });

    it('should default to limit 10 when not specified', async () => {
      // Clean up any existing posts
      await Post.deleteMany({});
      
      // Create 15 posts
      const posts = Array.from({ length: 15 }, (_, i) => ({
        title: `Post ${i + 1}`,
        content: `Content ${i + 1}`,
        excerpt: `Excerpt ${i + 1}`,
        author: superadminUser._id,
        isPublished: true,
        views: 15 - i
      }));
      await Post.create(posts);

      const response = await request(app)
        .get('/api/admin/posts/popular')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBe(10);
    });

    it('should enforce maximum limit of 50', async () => {
      const response = await request(app)
        .get('/api/admin/posts/popular?limit=100')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      // Even with limit=100, should return max 50 (or less if fewer posts exist)
      expect(response.body.posts.length).toBeLessThanOrEqual(50);
    });
  });

  describe('GET /api/admin/users/active', () => {
    const User = require('../models/User');

    it('should return active users within 15-minute window', async () => {
      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      
      // Should have at least superadmin and admin users from login
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
      
      // Verify response structure
      response.body.users.forEach(user => {
        expect(user).toHaveProperty('_id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('lastActiveAt');
        expect(typeof user.username).toBe('string');
        expect(typeof user.lastActiveAt).toBe('string');
        // fullName can be present or absent depending on the user, just verify username exists
      });
    });

    it('should exclude users outside 15-minute window', async () => {
      const User = require('../models/User');
      
      // Create a user with lastLogin > 15 minutes ago
      const oldUser = await User.create({
        username: 'olduser',
        email: 'old@example.com',
        password: 'Password123!',
        fullName: 'Old User',
        isActive: true,
        role: roles.adminRole._id, // Add required role field
        lastLogin: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      });

      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      
      // Should not include the old user
      const userIds = response.body.users.map(u => u._id.toString());
      expect(userIds).not.toContain(oldUser._id.toString());
    });

    it('should exclude inactive users', async () => {
      const User = require('../models/User');
      
      // Create an inactive user with recent login
      const inactiveUser = await User.create({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'Password123!',
        fullName: 'Inactive User',
        isActive: false,
        role: roles.adminRole._id, // Add required role field
        lastLogin: new Date() // Now
      });

      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      
      // Should not include the inactive user
      const userIds = response.body.users.map(u => u._id.toString());
      expect(userIds).not.toContain(inactiveUser._id.toString());
    });

    it('should return max 10 users', async () => {
      const User = require('../models/User');
      
      // Create 15 active users with recent login
      const users = Array.from({ length: 15 }, (_, i) => ({
        username: `activeuser${i}`,
        email: `active${i}@example.com`,
        password: 'Password123!',
        fullName: `Active User ${i}`,
        isActive: true,
        role: roles.adminRole._id, // Add required role field
        lastLogin: new Date(Date.now() - i * 60 * 1000) // Staggered login times
      }));
      await User.create(users);

      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeLessThanOrEqual(10);
    });

    it('should sort by lastLogin descending (most recent first)', async () => {
      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.users.length > 1) {
        // Verify users are sorted by lastActiveAt descending
        for (let i = 0; i < response.body.users.length - 1; i++) {
          const currentTime = new Date(response.body.users[i].lastActiveAt);
          const nextTime = new Date(response.body.users[i + 1].lastActiveAt);
          expect(currentTime >= nextTime).toBe(true);
        }
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users/active');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no active users', async () => {
      const User = require('../models/User');
      
      // Set all users' lastLogin to > 15 minutes ago
      await User.updateMany({}, {
        lastLogin: new Date(Date.now() - 20 * 60 * 1000)
      });

      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual([]);
    });

    it('should include fullName in response', async () => {
      const User = require('../models/User');
      
      // Create a test user with fullName
      const testUser = await User.create({
        username: 'fulltestuser',
        email: 'fulltest@example.com',
        password: 'Password123!',
        fullName: 'Full Test User',
        isActive: true,
        role: roles.adminRole._id,
        lastLogin: new Date() // Recent login
      });

      const response = await request(app)
        .get('/api/admin/users/active')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      
      // Find the test user in the response
      const foundUser = response.body.users.find(u => u.username === 'fulltestuser');
      expect(foundUser).toBeDefined();
      expect(foundUser.fullName).toBe('Full Test User');
    });
  });
});
