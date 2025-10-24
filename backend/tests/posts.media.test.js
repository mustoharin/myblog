const request = require('supertest');
const mongoose = require('mongoose');

// Mock MinIO and mediaProcessor before requiring app
jest.mock('../config/minio', () => ({
  minioClient: {
    putObject: jest.fn().mockResolvedValue({}),
    removeObject: jest.fn().mockResolvedValue({}),
    removeObjects: jest.fn().mockResolvedValue({}),
    listObjects: jest.fn(),
  },
}));

jest.mock('../utils/mediaProcessor', () => ({
  processImage: jest.fn().mockResolvedValue({
    thumbnailUrl: 'http://localhost:9000/blog-media/test/thumbnails/test.jpg',
  }),
}));

const app = require('../server');
const Post = require('../models/Post');
const Media = require('../models/Media');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const { getAuthToken } = require('./setup');

describe('Post-Media Integration', () => {
  let authToken;
  let testUser;
  let testMedia;
  let testPost;

  beforeEach(async () => {
    // Create privilege
    const privilege = await Privilege.create({
      name: 'Create Post',
      code: 'create_post',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
      description: 'Can create posts',
    });

    const updatePrivilege = await Privilege.create({
      name: 'Update Post',
      code: 'update_post',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
      description: 'Can update posts',
    });

    const deletePrivilege = await Privilege.create({
      name: 'Delete Post',
      code: 'delete_post',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
      description: 'Can delete posts',
    });

    const readPrivilege = await Privilege.create({
      name: 'Read Post',
      code: 'read_post',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
      description: 'Can read posts',
    });

    // Create role with privileges
    const role = await Role.create({
      name: 'test-author',
      displayName: 'Test Author',
      description: 'Test role for authors',
      privileges: [privilege._id, updatePrivilege._id, deletePrivilege._id, readPrivilege._id],
      isActive: true,
    });

    // Create test user with fresh timestamp
    const timestamp = Date.now();
    const username = `testauthor_${timestamp}`;
    testUser = await User.create({
      username,
      email: `${username}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Test Author',
      role: role._id,
    });

    // Login to get auth token with CAPTCHA
    authToken = await getAuthToken(app, username, 'TestPassword123!');

    // Create test media
    testMedia = await Media.create({
      filename: `test-image-${timestamp}.jpg`,
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      size: 100000,
      bucket: 'blog-media',
      key: `test/test-image-${timestamp}.jpg`,
      url: 'http://localhost:9000/blog-media/test/test-image.jpg',
      thumbnailUrl: 'http://localhost:9000/blog-media/test/thumbnails/test-image.jpg',
      altText: 'Test image',
      caption: 'A test image',
      uploadedBy: testUser._id,
      folder: 'test',
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testPost) {
      await Post.findByIdAndDelete(testPost._id);
    }
    if (testMedia) {
      await Media.findByIdAndDelete(testMedia._id);
    }
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      const role = await Role.findOne({ name: 'test-author' });
      if (role) {
        await Privilege.deleteMany({ _id: { $in: role.privileges } });
        await Role.findByIdAndDelete(role._id);
      }
    }
  });

  describe('POST /api/posts - Create post with featured image', () => {
    it('should create a post with featured image', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post with Featured Image',
          content: '<p>This is a test post with featured image</p>',
          excerpt: 'Test excerpt',
          tags: ['test', 'media'],
          isPublished: false,
          featuredImage: testMedia._id,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('Test Post with Featured Image');
      expect(res.body.featuredImage).toBeDefined();

      testPost = res.body;

      // Verify media usage tracking
      const media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(1);
      expect(media.usedIn[0].model).toBe('Post');
      expect(media.usedIn[0].id.toString()).toBe(testPost._id.toString());
      expect(media.usageCount).toBe(1);
    });

    it('should create a post without featured image', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post without Featured Image',
          content: '<p>This is a test post without featured image</p>',
          excerpt: 'Test excerpt',
          tags: ['test'],
          isPublished: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.featuredImage).toBeNull();

      testPost = res.body;
    });

    it('should return 404 if featured image does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post',
          content: '<p>Content</p>',
          featuredImage: fakeId,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Featured image not found');
    });
  });

  describe('PUT /api/posts/:id - Update featured image', () => {
    beforeEach(async () => {
      // Create a post without featured image
      const post = await Post.create({
        title: 'Test Post',
        content: '<p>Test content</p>',
        author: testUser._id,
        isPublished: false,
      });
      testPost = post;
    });

    it('should add featured image to existing post', async () => {
      const res = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: testMedia._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.featuredImage).toBeDefined();

      // Verify media usage tracking
      const media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(1);
      expect(media.usedIn[0].model).toBe('Post');
      expect(media.usageCount).toBe(1);
    });

    it('should change featured image', async () => {
      // First set featured image
      await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: testMedia._id,
        });

      // Create new media
      const newTimestamp = Date.now();
      const newMedia = await Media.create({
        filename: `new-image-${newTimestamp}.jpg`,
        originalName: 'new-image.jpg',
        mimeType: 'image/jpeg',
        size: 100000,
        bucket: 'blog-media',
        key: `test/new-image-${newTimestamp}.jpg`,
        url: 'http://localhost:9000/blog-media/test/new-image.jpg',
        uploadedBy: testUser._id,
        folder: 'test',
      });

      // Change to new media
      const res = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: newMedia._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.featuredImage._id).toBe(newMedia._id.toString());

      // Verify old media usage removed
      const oldMedia = await Media.findById(testMedia._id);
      expect(oldMedia.usedIn).toHaveLength(0);
      expect(oldMedia.usageCount).toBe(0);

      // Verify new media usage added
      const updatedNewMedia = await Media.findById(newMedia._id);
      expect(updatedNewMedia.usedIn).toHaveLength(1);
      expect(updatedNewMedia.usageCount).toBe(1);

      // Cleanup
      await Media.findByIdAndDelete(newMedia._id);
    });

    it('should remove featured image', async () => {
      // First set featured image
      await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: testMedia._id,
        });

      // Remove featured image
      const res = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.featuredImage).toBeNull();

      // Verify media usage removed
      const media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(0);
      expect(media.usageCount).toBe(0);
    });

    it('should return 404 if new featured image does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featuredImage: fakeId,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Featured image not found');
    });
  });

  describe('DELETE /api/posts/:id - Clean up media usage', () => {
    beforeEach(async () => {
      // Create a post with featured image
      const post = await Post.create({
        title: 'Test Post',
        content: '<p>Test content</p>',
        author: testUser._id,
        featuredImage: testMedia._id,
        isPublished: false,
      });
      testPost = post;

      // Add usage tracking
      await testMedia.addUsage('Post', testPost._id);
    });

    it('should remove media usage when post is deleted', async () => {
      // Verify media is tracked
      let media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(1);
      expect(media.usageCount).toBe(1);

      // Delete post
      const res = await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify media usage removed
      media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(0);
      expect(media.usageCount).toBe(0);
    });
  });

  describe('Public API - Featured images', () => {
    beforeEach(async () => {
      // Create published post with featured image
      const post = await Post.create({
        title: 'Public Post with Image',
        content: '<p>Public content</p>',
        excerpt: 'Public excerpt',
        author: testUser._id,
        featuredImage: testMedia._id,
        isPublished: true,
      });
      testPost = post;
    });

    it('should return featured image in public posts list', async () => {
      const res = await request(app)
        .get('/api/public/posts');

      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
      
      const post = res.body.posts.find(p => p._id === testPost._id.toString());
      expect(post).toBeDefined();
      expect(post.featuredImageUrl).toBeDefined();
      expect(post.featuredImageAlt).toBe(testMedia.altText);
    });

    it('should return featured image in single post view', async () => {
      const res = await request(app)
        .get(`/api/public/posts/${testPost._id}`);

      expect(res.status).toBe(200);
      expect(res.body.featuredImageUrl).toBe(testMedia.url);
      expect(res.body.featuredImageAlt).toBe(testMedia.altText);
      expect(res.body.featuredImageCaption).toBe(testMedia.caption);
    });

    it('should handle posts without featured image in public list', async () => {
      // Create post without featured image
      const postNoImage = await Post.create({
        title: 'Post without Image',
        content: '<p>Content</p>',
        author: testUser._id,
        isPublished: true,
      });

      const res = await request(app)
        .get('/api/public/posts');

      expect(res.status).toBe(200);
      
      const post = res.body.posts.find(p => p._id === postNoImage._id.toString());
      expect(post).toBeDefined();
      expect(post.featuredImageUrl).toBeNull();

      // Cleanup
      await Post.findByIdAndDelete(postNoImage._id);
    });
  });

  describe('Media deletion prevention', () => {
    beforeEach(async () => {
      // Create published post with featured image
      const post = await Post.create({
        title: 'Published Post',
        content: '<p>Content</p>',
        author: testUser._id,
        featuredImage: testMedia._id,
        isPublished: true,
      });
      testPost = post;

      // Add usage tracking
      await testMedia.addUsage('Post', testPost._id);
    });

    it('should track that media is in use', async () => {
      const media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(1);
      expect(media.usageCount).toBe(1);
      expect(media.usedIn[0].model).toBe('Post');
    });

    it('should show media is not in use after post deletion', async () => {
      // Delete post
      await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify media usage removed
      const media = await Media.findById(testMedia._id);
      expect(media.usedIn).toHaveLength(0);
      expect(media.usageCount).toBe(0);
    });
  });
});

describe('Post Model - Featured Image Population', () => {
  let testUser;
  let testMedia;
  let testPost;

  beforeEach(async () => {
    // Create minimal test data
    const role = await Role.create({
      name: 'test-role-model',
      displayName: 'Test Role',
      description: 'Test role for model tests',
      privileges: [],
      isActive: true,
    });

    testUser = await User.create({
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      password: 'Password123!',
      role: role._id,
    });

    const modelTimestamp = Date.now();
    testMedia = await Media.create({
      filename: `model-test-${modelTimestamp}.jpg`,
      originalName: 'model-test.jpg',
      mimeType: 'image/jpeg',
      size: 50000,
      bucket: 'blog-media',
      key: `test/model-test-${modelTimestamp}.jpg`,
      url: 'http://localhost:9000/blog-media/test/model-test.jpg',
      thumbnailUrl: 'http://localhost:9000/blog-media/test/thumbnails/model-test.jpg',
      altText: 'Model test',
      uploadedBy: testUser._id,
    });

    testPost = await Post.create({
      title: 'Test Post',
      content: '<p>Test</p>',
      author: testUser._id,
      featuredImage: testMedia._id,
    });
  });

  afterEach(async () => {
    if (testPost) await Post.findByIdAndDelete(testPost._id);
    if (testMedia) await Media.findByIdAndDelete(testMedia._id);
    if (testUser) {
      const role = await Role.findOne({ name: 'test-role-model' });
      await User.findByIdAndDelete(testUser._id);
      if (role) await Role.findByIdAndDelete(role._id);
    }
  });

  it('should populate featuredImage on find with explicit populate', async () => {
    const post = await Post.findById(testPost._id).populate('featuredImage');
    
    expect(post.featuredImage).toBeDefined();
    expect(post.featuredImage).not.toBeNull();
    expect(post.featuredImage.url).toBe(testMedia.url);
    expect(post.featuredImage.thumbnailUrl).toBe(testMedia.thumbnailUrl);
    expect(post.featuredImage.altText).toBe(testMedia.altText);
  });

  it('should populate featuredImage on findOne with explicit populate', async () => {
    const post = await Post.findOne({ _id: testPost._id }).populate('featuredImage');
    
    expect(post.featuredImage).toBeDefined();
    expect(post.featuredImage.url).toBe(testMedia.url);
  });
});
