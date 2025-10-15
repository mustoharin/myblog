const request = require('supertest');
const app = require('../server');
const { createTestUser, createInitialRoles, createInitialPrivileges } = require('./setup');
const Post = require('../models/Post');
const User = require('../models/User');

describe('Search and Tag Features', () => {
  let testAuthor;

  beforeEach(async () => {
    // Reset rate limiters before each test
    const { resetAllLimiters } = require('../middleware/rateLimiter');
    resetAllLimiters();

    // Clean up existing posts
    await Post.deleteMany({});
    
    const privileges = await createInitialPrivileges();
    const roles = await createInitialRoles(privileges);
    testAuthor = await createTestUser('testauthor', roles.regularRole._id);

    // Create test posts with different tags
    await Post.create([
      {
        title: 'JavaScript Basics',
        content: 'Learn the basics of JavaScript programming',
        author: testAuthor._id,
        tags: ['javascript', 'programming', 'basics'],
        isPublished: true
      },
      {
        title: 'Advanced Python Tips',
        content: 'Advanced programming techniques in Python',
        author: testAuthor._id,
        tags: ['python', 'programming', 'advanced'],
        isPublished: true
      },
      {
        title: 'Web Development Guide',
        content: 'Complete guide to web development',
        author: testAuthor._id,
        tags: ['web', 'programming', 'javascript'],
        isPublished: true
      },
      {
        title: 'Unpublished Post',
        content: 'This post should not appear in results',
        author: testAuthor._id,
        tags: ['test'],
        isPublished: false
      }
    ]);
  });

  describe('POST Search', () => {
    it('should search posts by title', async () => {
      const response = await request(app)
        .get('/api/public/posts?search=JavaScript')
        .expect(200);

      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toContain('JavaScript');
    });

    it('should search posts by content', async () => {
      const response = await request(app)
        .get('/api/public/posts?search=programming')
        .expect(200);

      expect(response.body.posts.length).toBeGreaterThan(1);
      expect(response.body.pagination.totalPosts).toBeGreaterThan(1);
    });

    it('should filter posts by single tag', async () => {
      const response = await request(app)
        .get('/api/public/posts?tags=python')
        .expect(200);

      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toContain('Python');
    });

    it('should filter posts by multiple tags', async () => {
      const response = await request(app)
        .get('/api/public/posts?tags=javascript,programming')
        .expect(200);

      expect(response.body.posts.length).toBeGreaterThan(1);
      expect(response.body.posts.every(post => 
        post.tags.includes('javascript') && post.tags.includes('programming')
      )).toBe(true);
    });

    it('should combine search and tag filtering', async () => {
      const response = await request(app)
        .get('/api/public/posts?search=advanced&tags=python')
        .expect(200);

      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toContain('Python');
      expect(response.body.posts[0].title).toContain('Advanced');
    });
  });

  describe('Tags API', () => {
    it('should return list of all used tags with counts', async () => {
      const response = await request(app)
        .get('/api/public/tags')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('_id');
      expect(response.body[0]).toHaveProperty('count');

      // Programming should be the most used tag
      expect(response.body[0]._id).toBe('programming');
      expect(response.body[0].count).toBe(3);
    });

    it('should only count tags from published posts', async () => {
      const response = await request(app)
        .get('/api/public/tags')
        .expect(200);

      const testTag = response.body.find(tag => tag._id === 'test');
      expect(testTag).toBeUndefined();
    });
  });
});