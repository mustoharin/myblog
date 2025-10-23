const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Post = require('../models/Post');
const User = require('../models/User');
const { createTestUser, createInitialRoles, createInitialPrivileges } = require('./setup');
const MockCaptcha = require('../utils/mockCaptcha');

describe('Public API', () => {
  let testUser;
  let testPost;

  beforeEach(async () => {
    // Reset rate limiters before each test
    const { resetAllLimiters } = require('../middleware/rateLimiter');
    resetAllLimiters();

    // Clean up existing data
    await Post.deleteMany({});
    await User.deleteMany({});

    const privileges = await createInitialPrivileges();
    const roles = await createInitialRoles(privileges);
    testUser = await createTestUser('testuser', roles.regularRole._id);

    // Create a test post
    testPost = await Post.create({
      title: 'Test Post',
      content: 'Test content for public API',
      excerpt: 'Test excerpt',
      author: testUser._id,
      isPublished: true,
    });
  });

  describe('GET /api/public/posts', () => {
    it('should list published posts with pagination', async () => {
      const response = await request(app)
        .get('/api/public/posts')
        .expect(200);

      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toBe('Test Post');
      expect(response.body.posts[0].excerpt).toBe('Test excerpt');
      expect(response.body.pagination).toBeDefined();
      expect(response.body.posts[0].author.username).toBe('testuser');
    });

    it('should honor pagination limits', async () => {
      // Create 15 more posts
      const posts = Array(15).fill().map((_, i) => ({
        title: `Post ${i}`,
        content: `<p>Content ${i}</p>`,
        author: testUser._id,
        excerpt: `Excerpt ${i}`,
        isPublished: true,
      }));
      await Post.insertMany(posts);

      const response = await request(app)
        .get('/api/public/posts?page=2&limit=6')
        .expect(200);

      expect(response.body.posts).toHaveLength(6); // Using a smaller page size
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.totalPages).toBe(3); // ceil(16/6) = 3
    });
  });

  describe('GET /api/public/posts/:id', () => {
    it('should return a published post with comments', async () => {
      const response = await request(app)
        .get(`/api/public/posts/${testPost._id}`)
        .expect(200);

      expect(response.body.title).toBe('Test Post');
      expect(response.body.content).toBe('Test content for public API');
      expect(response.body.author.username).toBe('testuser');
    });

    it('should return author fullName when available', async () => {
      // Create a user with fullName (using existing test user's role)
      const userWithFullName = await User.create({
        username: 'authoruser',
        email: 'author@test.com',
        password: 'password123',
        fullName: 'John Doe Author',
        role: testUser.role,
      });

      // Create a post with this author
      const postWithFullName = await Post.create({
        title: 'Post by Author with Full Name',
        content: '<p>Content by author with full name</p>',
        excerpt: 'Excerpt by author',
        author: userWithFullName._id,
        isPublished: true,
      });

      const response = await request(app)
        .get(`/api/public/posts/${postWithFullName._id}`)
        .expect(200);

      expect(response.body.author.username).toBe('authoruser');
      expect(response.body.author.fullName).toBe('John Doe Author');
      expect(response.body.author).toHaveProperty('fullName');
    });

    it('should not return an unpublished post', async () => {
      // Create an unpublished post
      const unpublishedPost = await Post.create({
        title: 'Unpublished Post',
        content: '<p>Unpublished content</p>',
        excerpt: 'Unpublished excerpt',
        author: testUser._id,
        isPublished: false,
      });
      
      await request(app)
        .get(`/api/public/posts/${unpublishedPost._id}`)
        .expect(404);
    });

    it('should return 404 for non-existent post', async () => {
      await request(app)
        .get('/api/public/posts/123456789012345678901234')
        .expect(404);
    });
  });

  describe('POST /api/public/posts/:id/comments', () => {
    it('should add a comment with test bypass token', async () => {
      const response = await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Test comment with bypass',
          name: 'Test User',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN,
        })
        .expect(201);

      expect(response.body.content).toBe('Test comment with bypass');
      expect(response.body.authorName).toBe('Test User');
    });
    
    it('should add a comment with valid captcha', async () => {
      // Get CAPTCHA for comment
      const captchaResponse = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      const response = await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Test comment',
          name: 'Test User',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId,
        })
        .expect(201);

      expect(response.body.content).toBe('Test comment');
      expect(response.body.authorName).toBe('Test User');
    });

    it('should reject comment without captcha', async () => {
      await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Test comment',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject comment with invalid captcha', async () => {
      // Get CAPTCHA first
      const captchaResponse = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Test comment',
          name: 'Test User',
          captchaText: 'wrong',
          captchaSessionId: captchaResponse.body.sessionId,
        })
        .expect(400);
    });

    it('should reject XSS in name field', async () => {
      // Get CAPTCHA first
      const captchaResponse = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Test comment',
          name: '<script>alert("xss")</script>',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId,
        })
        .expect(400);
    });

    it('should validate comment length', async () => {
      // Get CAPTCHA for empty comment test
      const captchaResponse1 = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: '', // Empty comment
          name: 'Test User',
          captchaText: '123456',
          captchaSessionId: captchaResponse1.body.sessionId,
        })
        .expect(400);

      // Generate a comment that's too long (1001 characters)
      const longComment = 'x'.repeat(1001);

      // Get CAPTCHA for long comment test
      const captchaResponse2 = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: longComment,
          name: 'Test User',
          captchaText: '123456',
          captchaSessionId: captchaResponse2.body.sessionId,
        })
        .expect(400);
    });
  });

  describe('POST /api/public/posts/:id/view', () => {
    it('should increment view count for published post', async () => {
      const response = await request(app)
        .post(`/api/public/posts/${testPost._id}/view`)
        .expect(200);

      expect(response.body.views).toBe(1);

      // Verify it increments again
      const response2 = await request(app)
        .post(`/api/public/posts/${testPost._id}/view`)
        .expect(200);

      expect(response2.body.views).toBe(2);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .post(`/api/public/posts/${fakeId}/view`)
        .expect(404);
    });

    it('should return 404 for unpublished post', async () => {
      const unpublishedPost = await Post.create({
        title: 'Unpublished Post',
        content: 'This is an unpublished post',
        excerpt: 'Unpublished',
        author: testUser._id,
        isPublished: false,
      });

      await request(app)
        .post(`/api/public/posts/${unpublishedPost._id}/view`)
        .expect(404);
    });

    it('should return 404 for invalid post ID', async () => {
      await request(app)
        .post('/api/public/posts/invalid-id/view')
        .expect(404);
    });

    it('should handle multiple concurrent view increments correctly', async () => {
      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app).post(`/api/public/posts/${testPost._id}/view`));

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.views).toBeGreaterThan(0);
      });

      // Verify final count
      const finalResponse = await request(app)
        .post(`/api/public/posts/${testPost._id}/view`)
        .expect(200);

      expect(finalResponse.body.views).toBe(6);
    });
  });

  describe('POST /api/public/posts/:id/share', () => {
    it('should increment share count for published post', async () => {
      const response = await request(app)
        .post(`/api/public/posts/${testPost._id}/share`)
        .expect(200);

      expect(response.body.shares).toBe(1);

      // Verify it increments again
      const response2 = await request(app)
        .post(`/api/public/posts/${testPost._id}/share`)
        .expect(200);

      expect(response2.body.shares).toBe(2);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .post(`/api/public/posts/${fakeId}/share`)
        .expect(404);
    });

    it('should return 404 for unpublished post', async () => {
      const unpublishedPost = await Post.create({
        title: 'Unpublished Post for Share',
        content: '<p>This is an unpublished post</p>',
        excerpt: 'Unpublished',
        author: testUser._id,
        isPublished: false,
      });

      await request(app)
        .post(`/api/public/posts/${unpublishedPost._id}/share`)
        .expect(404);
    });

    it('should return 404 for invalid post ID', async () => {
      await request(app)
        .post('/api/public/posts/invalid-id/share')
        .expect(404);
    });

    it('should handle multiple concurrent share increments correctly', async () => {
      // Make multiple concurrent requests
      const requests = Array(3).fill(null).map(() =>
        request(app).post(`/api/public/posts/${testPost._id}/share`));

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.shares).toBeGreaterThan(0);
      });

      // Verify final count
      const finalResponse = await request(app)
        .post(`/api/public/posts/${testPost._id}/share`)
        .expect(200);

      expect(finalResponse.body.shares).toBe(4);
    });
  });
});