const request = require('supertest');
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
      isPublished: true
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
        isPublished: true
      }));
      await Post.insertMany(posts);

      const response = await request(app)
        .get('/api/public/posts?page=2&limit=6')
        .expect(200);

      expect(response.body.posts).toHaveLength(6); // Using a smaller page size
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.totalPages).toBe(3); // ceil(16/6) = 3
    });

    it.skip('should enforce rate limiting', async () => {
      // Reset rate limiters
      const { resetAllLimiters } = require('../middleware/rateLimiter');
      resetAllLimiters();

      // Make 1000 requests (reaching the 1000 per windowMs limit)
      for (let i = 0; i < 1000; i++) {
        await request(app).get('/api/public/posts');
      }
      
      const response = await request(app)
        .get('/api/public/posts')
        .expect(429);

      expect(response.body.message).toContain('Too many requests');
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

    it('should not return an unpublished post', async () => {
      // Create an unpublished post
      const unpublishedPost = await Post.create({
        title: 'Unpublished Post',
        content: '<p>Unpublished content</p>',
        excerpt: 'Unpublished excerpt',
        author: testUser._id,
        isPublished: false
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
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
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
          captchaSessionId: captchaResponse.body.sessionId
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
          name: 'Test User'
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
          captchaSessionId: captchaResponse.body.sessionId
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
          captchaSessionId: captchaResponse.body.sessionId
        })
        .expect(400);
    });

    it.skip('should enforce comment rate limiting even with bypass token', async () => {
      // Reset rate limiters
      const { resetAllLimiters } = require('../middleware/rateLimiter');
      resetAllLimiters();

      // Make 100 comments sequentially and quickly (reaching the 100 per windowMs limit) with bypass token
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post(`/api/public/posts/${testPost._id}/comments`)
          .send({
            content: `Comment ${i}`,
            name: 'Test User',
            testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
          })
          .expect(201);
      }

      // Small delay to ensure we're still in the same window
      await new Promise(resolve => setTimeout(resolve, 10));

      // Attempt one more comment - should be rate limited even with bypass token
      const response = await request(app)
        .post(`/api/public/posts/${testPost._id}/comments`)
        .send({
          content: 'Rate limited comment',
          name: 'Test User',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        })
        .expect(429);

      expect(response.body.message).toContain('Too many comments');
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
          captchaSessionId: captchaResponse1.body.sessionId
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
          captchaSessionId: captchaResponse2.body.sessionId
        })
        .expect(400);
    });
  });
});