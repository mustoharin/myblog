const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const Post = require('../models/Post');
const Media = require('../models/Media');
const { getAuthToken } = require('./setup');
const { 
  extractImageUrls, 
  filterLocalMediaUrls, 
  getMediaIdsFromUrls,
  extractMediaIdsFromContent 
} = require('../utils/mediaExtractor');

// Mock MinIO and mediaProcessor
jest.mock('../config/minio', () => ({
  minioClient: {
    putObject: jest.fn((bucket, name, buffer, size, metadata, callback) => {
      callback(null, { etag: 'mock-etag' });
    }),
    removeObject: jest.fn().mockResolvedValue({}),
  },
  bucketName: process.env.MINIO_BUCKET || 'myblog-media',
  uploadFile: jest.fn().mockResolvedValue({ url: 'http://localhost:9000/myblog-media/test.jpg' }),
  deleteFile: jest.fn().mockResolvedValue({}),
}));

jest.mock('../utils/mediaProcessor', () => ({
  processImage: jest.fn(async (buffer) => ({
    optimized: buffer,
    thumbnail: buffer,
  })),
  formatFileSize: jest.fn((size) => `${size} bytes`),
}));

const MINIO_BASE_URL = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'myblog-media';

describe('Posts - Content Media Extraction (Phase 2)', () => {
  let authToken;
  let superadminUser;
  let testMedia1, testMedia2, testMedia3;

  beforeEach(async () => {
    // Create privileges
    const privileges = await Privilege.create([
      { 
        name: 'Manage Media', 
        code: 'manage_media', 
        description: 'Can upload and manage media',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
      { 
        name: 'Create Post', 
        code: 'create_post', 
        description: 'Can create posts',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
      { 
        name: 'Read Post', 
        code: 'read_post', 
        description: 'Can read posts',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
      { 
        name: 'Update Post', 
        code: 'update_post', 
        description: 'Can update posts',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
      { 
        name: 'Delete Post', 
        code: 'delete_post', 
        description: 'Can delete posts',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
      { 
        name: 'Publish Post', 
        code: 'publish_post', 
        description: 'Can publish posts',
        module: 'content_management',
        moduleDisplayName: 'Content Management'
      },
    ]);

    // Create superadmin role
    const superadminRole = await Role.create({
      name: 'superadmin',
      description: 'Super Administrator',
      privileges: privileges.map(p => p._id),
    });

    // Create superadmin user
    superadminUser = await User.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'Password123!',
      role: superadminRole._id,
    });

    // Get auth token
    authToken = await getAuthToken(app, 'testadmin', 'Password123!');

    // Create test media items
    testMedia1 = await Media.create({
      filename: 'test-image-1.jpg',
      originalName: 'test1.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      bucket: MINIO_BUCKET,
      key: 'test-image-1.jpg',
      url: `${MINIO_BASE_URL}/${MINIO_BUCKET}/test-image-1.jpg`,
      thumbnailUrl: `${MINIO_BASE_URL}/${MINIO_BUCKET}/thumb-test-image-1.jpg`,
      uploadedBy: superadminUser._id,
    });

    testMedia2 = await Media.create({
      filename: 'test-image-2.jpg',
      originalName: 'test2.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
      bucket: MINIO_BUCKET,
      key: 'test-image-2.jpg',
      url: `${MINIO_BASE_URL}/${MINIO_BUCKET}/test-image-2.jpg`,
      thumbnailUrl: `${MINIO_BASE_URL}/${MINIO_BUCKET}/thumb-test-image-2.jpg`,
      uploadedBy: superadminUser._id,
    });

    testMedia3 = await Media.create({
      filename: 'test-image-3.jpg',
      originalName: 'test3.jpg',
      mimeType: 'image/jpeg',
      size: 3072,
      bucket: MINIO_BUCKET,
      key: 'test-image-3.jpg',
      url: `${MINIO_BASE_URL}/${MINIO_BUCKET}/test-image-3.jpg`,
      thumbnailUrl: `${MINIO_BASE_URL}/${MINIO_BUCKET}/thumb-test-image-3.jpg`,
      uploadedBy: superadminUser._id,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await Post.deleteMany({});
    await Media.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Media Extraction Utilities', () => {
    test('should extract image URLs from HTML content', () => {
      const html = `
        <p>Hello world</p>
        <img src="http://localhost:9000/myblog-media/image1.jpg" alt="Test 1">
        <p>More content</p>
        <img src="http://localhost:9000/myblog-media/image2.jpg" alt="Test 2" />
        <img src='http://localhost:9000/myblog-media/image3.jpg' alt='Test 3'>
      `;

      const urls = extractImageUrls(html);
      expect(urls).toHaveLength(3);
      expect(urls).toContain('http://localhost:9000/myblog-media/image1.jpg');
      expect(urls).toContain('http://localhost:9000/myblog-media/image2.jpg');
      expect(urls).toContain('http://localhost:9000/myblog-media/image3.jpg');
    });

    test('should handle HTML with no images', () => {
      const html = '<p>No images here</p>';
      const urls = extractImageUrls(html);
      expect(urls).toHaveLength(0);
    });

    test('should filter local media URLs', () => {
      const urls = [
        `${MINIO_BASE_URL}/${MINIO_BUCKET}/local-image.jpg`,
        'http://example.com/external-image.jpg',
        `${MINIO_BASE_URL}/${MINIO_BUCKET}/another-local.jpg`,
        'https://cdn.example.com/cdn-image.jpg',
      ];

      const localUrls = filterLocalMediaUrls(urls, MINIO_BASE_URL);
      expect(localUrls).toHaveLength(2);
      expect(localUrls).toContain(`${MINIO_BASE_URL}/${MINIO_BUCKET}/local-image.jpg`);
      expect(localUrls).toContain(`${MINIO_BASE_URL}/${MINIO_BUCKET}/another-local.jpg`);
    });

    test('should get media IDs from URLs', async () => {
      const urls = [
        testMedia1.url,
        testMedia2.url,
        'http://localhost:9000/myblog-media/nonexistent.jpg',
      ];

      const mediaIds = await getMediaIdsFromUrls(urls);
      expect(mediaIds).toHaveLength(2);
      expect(mediaIds.map(id => id.toString())).toContain(testMedia1._id.toString());
      expect(mediaIds.map(id => id.toString())).toContain(testMedia2._id.toString());
    });

    test('should extract media IDs from HTML content', async () => {
      const html = `
        <p>Article with images</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="http://external.com/image.jpg" alt="External">
        <img src="${testMedia2.url}" alt="Image 2">
      `;

      const mediaIds = await extractMediaIdsFromContent(html);
      expect(mediaIds).toHaveLength(2);
      expect(mediaIds.map(id => id.toString())).toContain(testMedia1._id.toString());
      expect(mediaIds.map(id => id.toString())).toContain(testMedia2._id.toString());
    });
  });

  describe('POST /api/posts - Content Media Tracking', () => {
    test('should track media used in post content on creation', async () => {
      const content = `
        <p>Test post with images</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="${testMedia2.url}" alt="Image 2">
      `;

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post with Content Media',
          content,
          isPublished: false,
        });

      expect(response.status).toBe(201);
      expect(response.body._id).toBeDefined();

      // Check that media items have the post in their usedIn array
      const media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);

      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === response.body._id
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === response.body._id
      );

      expect(usage1).toBeDefined();
      expect(usage2).toBeDefined();
    });

    test('should track both featured image and content media', async () => {
      const content = `<p>Content with <img src="${testMedia2.url}" alt="Image"></p>`;

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post with Featured and Content Media',
          content,
          featuredImage: testMedia1._id.toString(),
          isPublished: false,
        });

      expect(response.status).toBe(201);

      const media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);

      // Both should have usage tracking
      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === response.body._id
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === response.body._id
      );

      expect(usage1).toBeDefined();
      expect(usage2).toBeDefined();
    });

    test('should ignore external images in content', async () => {
      const content = `
        <p>Post with mixed images</p>
        <img src="http://external.com/image1.jpg" alt="External 1">
        <img src="${testMedia1.url}" alt="Local">
        <img src="https://cdn.example.com/image2.jpg" alt="External 2">
      `;

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post with External Images',
          content,
          isPublished: false,
        });

      expect(response.status).toBe(201);

      // Only local media should be tracked
      const media1 = await Media.findById(testMedia1._id);
      const usage = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === response.body._id
      );

      expect(usage).toBeDefined();
    });

    test('should handle post with no images in content', async () => {
      const content = '<p>This post has no images</p>';

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post without Images',
          content,
          isPublished: false,
        });

      expect(response.status).toBe(201);
      expect(response.body._id).toBeDefined();
    });
  });

  describe('PUT /api/posts/:id - Content Media Updates', () => {
    test('should track new media when content is updated', async () => {
      // Create post with one image
      const initialContent = `<p>Initial <img src="${testMedia1.url}" alt="Image 1"></p>`;
      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Update',
          content: initialContent,
          isPublished: false,
        });

      const postId = createResponse.body._id;

      // Update content to add another image
      const updatedContent = `
        <p>Updated content</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="${testMedia2.url}" alt="Image 2">
      `;

      const updateResponse = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: updatedContent });

      expect(updateResponse.status).toBe(200);

      // Both media items should now be tracked
      const media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);

      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );

      expect(usage1).toBeDefined();
      expect(usage2).toBeDefined();
    });

    test('should remove tracking when media is removed from content', async () => {
      // Create post with two images
      const initialContent = `
        <p>Content with images</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="${testMedia2.url}" alt="Image 2">
      `;

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Update - Remove Media',
          content: initialContent,
          isPublished: false,
        });

      const postId = createResponse.body._id;

      // Update content to remove one image
      const updatedContent = `<p>Updated with only <img src="${testMedia1.url}" alt="Image 1"></p>`;

      await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: updatedContent });

      // Media1 should still be tracked
      const media1 = await Media.findById(testMedia1._id);
      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      expect(usage1).toBeDefined();

      // Media2 should no longer be tracked
      const media2 = await Media.findById(testMedia2._id);
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      expect(usage2).toBeUndefined();
    });

    test('should handle replacing all content media', async () => {
      // Create post with media1 and media2
      const initialContent = `
        <p>Initial</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="${testMedia2.url}" alt="Image 2">
      `;

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Replace All Media',
          content: initialContent,
          isPublished: false,
        });

      const postId = createResponse.body._id;

      // Replace with media3
      const updatedContent = `<p>New content <img src="${testMedia3.url}" alt="Image 3"></p>`;

      await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: updatedContent });

      // Media3 should be tracked
      const media3 = await Media.findById(testMedia3._id);
      const usage3 = media3.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      expect(usage3).toBeDefined();

      // Media1 and media2 should not be tracked
      const media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);
      
      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );

      expect(usage1).toBeUndefined();
      expect(usage2).toBeUndefined();
    });
  });

  describe('DELETE /api/posts/:id - Content Media Cleanup', () => {
    test('should remove all content media tracking on post deletion', async () => {
      // Create post with multiple images
      const content = `
        <p>Post to delete</p>
        <img src="${testMedia1.url}" alt="Image 1">
        <img src="${testMedia2.url}" alt="Image 2">
        <img src="${testMedia3.url}" alt="Image 3">
      `;

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Delete',
          content,
          isPublished: false,
        });

      const postId = createResponse.body._id;

      // Verify media is tracked before deletion
      let media1 = await Media.findById(testMedia1._id);
      let usage1Before = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      expect(usage1Before).toBeDefined();

      // Delete the post
      const deleteResponse = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify all media tracking is removed
      media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);
      const media3 = await Media.findById(testMedia3._id);

      const usage1After = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      const usage3 = media3.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );

      expect(usage1After).toBeUndefined();
      expect(usage2).toBeUndefined();
      expect(usage3).toBeUndefined();
    });

    test('should remove both featured image and content media tracking', async () => {
      const content = `<p>Content with <img src="${testMedia2.url}" alt="Image"></p>`;

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post with Featured and Content',
          content,
          featuredImage: testMedia1._id.toString(),
          isPublished: false,
        });

      const postId = createResponse.body._id;

      // Delete the post
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Both media items should have no usage
      const media1 = await Media.findById(testMedia1._id);
      const media2 = await Media.findById(testMedia2._id);

      const usage1 = media1.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );
      const usage2 = media2.usedIn.find(u => 
        u.model === 'Post' && u.id.toString() === postId
      );

      expect(usage1).toBeUndefined();
      expect(usage2).toBeUndefined();
    });
  });

  describe('Media Deletion Protection', () => {
    test('should prevent deletion of media used in post content', async () => {
      // Create post with image in content
      const content = `<p>Post with <img src="${testMedia1.url}" alt="Image"></p>`;

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post Using Media',
          content,
          isPublished: false,
        });

      expect(createResponse.status).toBe(201);

      // Try to delete the media
      const deleteResponse = await request(app)
        .delete(`/api/media/${testMedia1._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body.message).toContain('in use');
    });

    test('should allow deletion of unused media', async () => {
      // Create a media item not used anywhere
      const unusedMedia = await Media.create({
        filename: 'unused-image.jpg',
        originalName: 'unused.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: MINIO_BUCKET,
        key: 'unused-image.jpg',
        url: `${MINIO_BASE_URL}/${MINIO_BUCKET}/unused-image.jpg`,
        thumbnailUrl: `${MINIO_BASE_URL}/${MINIO_BUCKET}/thumb-unused-image.jpg`,
        uploadedBy: superadminUser._id,
      });

      const deleteResponse = await request(app)
        .delete(`/api/media/${unusedMedia._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });
});
