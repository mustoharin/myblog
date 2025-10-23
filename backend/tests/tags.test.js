const request = require('supertest');
const app = require('../server');
const Tag = require('../models/Tag');
const Post = require('../models/Post');
const Role = require('../models/Role');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getAuthToken,
  getSuperadminToken,
  getAdminToken,
} = require('./setup');

describe('Tag Routes - RBAC', () => {
  let privileges, roles, superadminUser, adminUser, regularUser, userWithoutPrivilege;
  let superadminToken, adminToken, regularToken, noPrivilegeToken;
  let testTag;

  beforeEach(async () => {
    // Setup initial data
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    
    // Create a role without manage_tags privilege
    const readOnlyRole = await Role.create({
      name: 'readonly',
      description: 'Read Only User',
      privileges: privileges.filter(p => p.code === 'read_post').map(p => p._id),
    });
    
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);
    regularUser = await createTestUser('regular', roles.regularRole._id);
    userWithoutPrivilege = await createTestUser('readonly', readOnlyRole._id);

    // Get tokens
    superadminToken = await getSuperadminToken(app);
    adminToken = await getAdminToken(app);
    regularToken = await getAuthToken(app, 'regular', 'Password#12345!');
    noPrivilegeToken = await getAuthToken(app, 'readonly', 'Password#12345!');

    // Clean up tags
    await Tag.deleteMany({});

    // Create a test tag
    testTag = await Tag.create({
      name: 'test-tag',
      displayName: 'Test Tag',
      description: 'A test tag',
      color: '#1976d2',
      isActive: true,
      postCount: 0,
    });
  });

  describe('GET /api/tags - List Tags', () => {
    it('should allow user with manage_tags privilege to list tags', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tags');

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${noPrivilegeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('privilege');
    });

    it('should allow superadmin with manage_tags privilege to list tags', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
    });

    it('should support pagination', async () => {
      // Create multiple tags
      await Tag.create([
        { name: 'tag1', displayName: 'Tag 1', color: '#1976d2', isActive: true },
        { name: 'tag2', displayName: 'Tag 2', color: '#1976d2', isActive: true },
        { name: 'tag3', displayName: 'Tag 3', color: '#1976d2', isActive: true },
      ]);

      const response = await request(app)
        .get('/api/tags?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support search functionality', async () => {
      await Tag.create([
        { name: 'javascript', displayName: 'JavaScript', color: '#1976d2', isActive: true },
        { name: 'python', displayName: 'Python', color: '#1976d2', isActive: true },
      ]);

      const response = await request(app)
        .get('/api/tags?search=javascript')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      const found = response.body.items.some(tag => tag.name.includes('javascript'));
      expect(found).toBeTruthy();
    });
  });

  describe('GET /api/tags/:id - Get Single Tag', () => {
    it('should allow user with manage_tags privilege to get tag details', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('test-tag');
      expect(response.body.displayName).toBe('Test Tag');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}`);

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${noPrivilegeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tags/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tags - Create Tag', () => {
    it('should allow user with manage_tags privilege to create tag', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'new-tag',
          displayName: 'New Tag',
          description: 'A new test tag',
          color: '#ff0000',
          isActive: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('new-tag');
      expect(response.body.displayName).toBe('New Tag');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tags')
        .send({
          name: 'new-tag',
          displayName: 'New Tag',
        });

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${noPrivilegeToken}`)
        .send({
          name: 'new-tag',
          displayName: 'New Tag',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('privilege');
    });

    it('should require name and displayName', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should format tag name correctly', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Tag With Spaces',
          displayName: 'Test Tag',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('test-tag-with-spaces');
    });

    it('should prevent duplicate tag names', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test-tag',
          displayName: 'Duplicate Tag',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate invalid tag name characters', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '!@#$%^&*()',
          displayName: 'Invalid Tag',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('PUT /api/tags/:id - Update Tag', () => {
    it('should allow user with manage_tags privilege to update tag', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated Tag',
          description: 'Updated description',
          color: '#00ff00',
        });

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('Updated Tag');
      expect(response.body.description).toBe('Updated description');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .send({
          displayName: 'Updated Tag',
        });

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${noPrivilegeToken}`)
        .send({
          displayName: 'Updated Tag',
        });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/tags/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated Tag',
        });

      expect(response.status).toBe(404);
    });

    it('should allow updating isActive status', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/tags/:id - Delete Tag', () => {
    it('should allow user with manage_tags privilege to delete tag', async () => {
      const response = await request(app)
        .delete(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify tag was soft deleted by checking it's not in normal queries
      const normalQuery = await Tag.findById(testTag._id);
      expect(normalQuery).toBeNull();
      
      // But exists in database with deletedAt set
      const deletedTag = await Tag.collection.findOne({ _id: testTag._id });
      expect(deletedTag).toBeTruthy();
      expect(deletedTag.deletedAt).toBeTruthy();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/tags/${testTag._id}`);

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .delete(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${noPrivilegeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/tags/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tags/:id/stats - Get Tag Statistics', () => {
    beforeEach(async () => {
      // Create test posts with the tag
      await Post.create([
        {
          title: 'Post 1',
          content: 'Content 1',
          author: adminUser._id,
          tags: ['test-tag'],
          isPublished: true,
        },
        {
          title: 'Post 2',
          content: 'Content 2',
          author: adminUser._id,
          tags: ['test-tag'],
          isPublished: true,
        },
        {
          title: 'Draft Post',
          content: 'Draft Content',
          author: adminUser._id,
          tags: ['test-tag'],
          isPublished: false,
        },
      ]);
    });

    it('should allow user with manage_tags privilege to get tag stats', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tag).toBe('test-tag');
      expect(response.body.postCount).toBe(2); // Only published posts
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}/stats`);

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}/stats`)
        .set('Authorization', `Bearer ${noPrivilegeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tags/${fakeId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should only count published posts', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.postCount).toBe(2); // Not 3
    });
  });

  describe('POST /api/tags/sync-counts - Sync Tag Counts', () => {
    beforeEach(async () => {
      // Create tags and posts
      await Tag.create([
        { name: 'active-tag', displayName: 'Active Tag', color: '#1976d2', isActive: true, postCount: 0 },
        { name: 'unused-tag', displayName: 'Unused Tag', color: '#1976d2', isActive: true, postCount: 5 },
      ]);

      await Post.create([
        {
          title: 'Post with active tag',
          content: 'Content',
          author: adminUser._id,
          tags: ['active-tag'],
          isPublished: true,
        },
        {
          title: 'Post with active tag 2',
          content: 'Content',
          author: adminUser._id,
          tags: ['active-tag'],
          isPublished: true,
        },
        {
          title: 'Post with new tag',
          content: 'Content',
          author: adminUser._id,
          tags: ['new-tag-from-post'],
          isPublished: true,
        },
      ]);
    });

    it('should allow user with manage_tags privilege to sync tag counts', async () => {
      const response = await request(app)
        .post('/api/tags/sync-counts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('synchronized');
      expect(response.body.created).toBeGreaterThanOrEqual(0);
      expect(response.body.updated).toBeGreaterThanOrEqual(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tags/sync-counts');

      expect(response.status).toBe(401);
    });

    it('should deny access without manage_tags privilege', async () => {
      const response = await request(app)
        .post('/api/tags/sync-counts')
        .set('Authorization', `Bearer ${noPrivilegeToken}`);

      expect(response.status).toBe(403);
    });

    it('should update existing tag counts', async () => {
      await request(app)
        .post('/api/tags/sync-counts')
        .set('Authorization', `Bearer ${adminToken}`);

      const activeTag = await Tag.findOne({ name: 'active-tag' });
      expect(activeTag.postCount).toBe(2);
    });

    it('should reset counts for unused tags', async () => {
      await request(app)
        .post('/api/tags/sync-counts')
        .set('Authorization', `Bearer ${adminToken}`);

      const unusedTag = await Tag.findOne({ name: 'unused-tag' });
      expect(unusedTag.postCount).toBe(0);
    });

    it('should create tags that exist in posts but not in Tag collection', async () => {
      const beforeCount = await Tag.countDocuments({ name: 'new-tag-from-post' });
      expect(beforeCount).toBe(0);

      await request(app)
        .post('/api/tags/sync-counts')
        .set('Authorization', `Bearer ${adminToken}`);

      const afterCount = await Tag.countDocuments({ name: 'new-tag-from-post' });
      expect(afterCount).toBe(1);

      const newTag = await Tag.findOne({ name: 'new-tag-from-post' });
      expect(newTag.postCount).toBe(1);
    });
  });
});
