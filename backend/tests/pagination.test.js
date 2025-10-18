const request = require('supertest');
const app = require('../server');
const { createTestUser, createInitialRoles, createInitialPrivileges } = require('./setup');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const Post = require('../models/Post');

describe('Pagination', () => {
  let adminUser, adminToken;

  beforeEach(async () => {
    // Setup test data
    const privileges = await createInitialPrivileges();
    const roles = await createInitialRoles(privileges);
    adminUser = await createTestUser('admin', roles.superadminRole._id);

    // Get CAPTCHA first
    const captchaResponse = await request(app)
      .get('/api/auth/captcha');

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Password#12345!',
        captchaText: '123456',
        captchaSessionId: captchaResponse.body.sessionId,
      });

    adminToken = loginResponse.body.token;

    // Create test data
    // 1. Create 25 users
    const users = [];
    for (let i = 1; i <= 25; i++) {
      users.push({
        username: `testuser${i}`,
        email: `test${i}@example.com`,
        password: 'Password123!',
        role: roles.regularRole._id,
      });
    }
    await User.insertMany(users);

    // 2. Create 15 roles
    const roleData = [];
    for (let i = 1; i <= 15; i++) {
      roleData.push({
        name: `TestRole${i}`,
        description: `Test role ${i}`,
        privileges: [privileges[0]._id],
      });
    }
    await Role.insertMany(roleData);

    // 3. Create 20 privileges
    const privData = [];
    for (let i = 1; i <= 20; i++) {
      privData.push({
        name: `TestPrivilege${i}`,
        description: `Test privilege ${i}`,
        code: `test_priv_${i}`,
        module: 'system_administration',
        moduleDisplayName: 'System Administration',
      });
    }
    await Privilege.insertMany(privData);

    // Create test author
    const testAuthor = await User.create({
      username: 'testauthor',
      email: 'testauthor@example.com',
      password: 'Password123!',
      role: roles.regularRole._id,
    });

    // 4. Create 30 posts
    const posts = [];
    for (let i = 1; i <= 30; i++) {
      posts.push({
        title: `Test Post ${i}`,
        content: `Test content ${i}`,
        author: testAuthor._id,
        isPublished: true,
        createdAt: new Date(),
      });
    }
    await Post.insertMany(posts);
  });

  describe('Users List', () => {
    it('should return paginated users list with default values', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.items.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
      expect(response.body.items[0].password).toBeUndefined();
    });

    it('should honor custom page and limit parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=2&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.itemsPerPage).toBe(5);
    });

    it('should apply sorting correctly', async () => {
      const response = await request(app)
        .get('/api/users?sort=-username')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const usernames = response.body.items.map(user => user.username);
      expect([...usernames].sort().reverse()).toEqual(usernames);
    });
  });

  describe('Roles List', () => {
    it('should return paginated roles list with default values', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.items.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.items[0].privileges).toBeDefined();
    });

    it('should handle large limit values gracefully', async () => {
      const response = await request(app)
        .get('/api/roles?limit=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(50); // Max limit
    });
  });

  describe('Privileges List', () => {
    it('should return paginated privileges list with default values', async () => {
      const response = await request(app)
        .get('/api/privileges')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.items.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.totalItems).toBeGreaterThan(20);
    });

    it('should provide accurate pagination metadata', async () => {
      const limit = 5;
      const response = await request(app)
        .get(`/api/privileges?limit=${limit}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const totalItems = response.body.pagination.totalItems;
      expect(response.body.pagination.totalPages).toBe(Math.ceil(totalItems / limit));
      expect(response.body.pagination.hasNextPage).toBe(true);
      expect(response.body.pagination.hasPrevPage).toBe(false);
    });
  });

  describe('Posts List', () => {
    it('should return paginated posts list with default values', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.items.length).toBeLessThanOrEqual(10);
      expect(response.body.items[0].author).toBeDefined();
      expect(response.body.items[0].author.username).toBeDefined();
    });

    it('should return empty items array for invalid page', async () => {
      const response = await request(app)
        .get('/api/posts?page=999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.pagination.hasNextPage).toBe(false);
    });

    it('should sort posts by creation date in descending order by default', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const dates = response.body.items.map(post => new Date(post.createdAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });
  });
});