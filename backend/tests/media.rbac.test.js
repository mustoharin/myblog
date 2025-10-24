const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const Media = require('../models/Media');
const Activity = require('../models/Activity');
const { getAuthToken } = require('./setup');

// Mock MinIO functions
jest.mock('../config/minio', () => ({
  bucketName: 'test-bucket',
  uploadFile: jest.fn().mockResolvedValue('http://localhost:9000/test-bucket/test-file.jpg'),
  deleteFile: jest.fn().mockResolvedValue(true),
  fileExists: jest.fn().mockResolvedValue(true),
  initBucket: jest.fn().mockResolvedValue(true),
}));

// Mock media processor
jest.mock('../utils/mediaProcessor', () => ({
  generateFilename: jest.fn(original => `test-${Date.now()}-${original}`),
  sanitizeFolderName: jest.fn(folder => folder.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()),
  optimizeImage: jest.fn(async buffer => ({
    buffer,
    metadata: {
      width: 1920,
      height: 1080,
      format: 'jpeg',
      originalSize: buffer.length,
      optimizedSize: buffer.length * 0.8,
      compressionRatio: '20.00',
      isOptimized: true,
    },
  })),
  createThumbnail: jest.fn(async buffer => buffer),
  getFileCategory: jest.fn(mimeType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'document';
    return 'other';
  }),
  formatFileSize: jest.fn(bytes => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }),
}));

describe('Media Routes - RBAC Tests', () => {
  let adminToken;
  let viewerToken;
  let adminUser;
  let viewerUser;
  let manageMediaPrivilege;
  let testMedia;

  beforeEach(async () => {
    // Clean up before each test
    await Activity.deleteMany({});
    await Media.deleteMany({});
    await User.deleteMany({});
    await Role.deleteMany({});
    await Privilege.deleteMany({});

    // Create manage_media privilege
    manageMediaPrivilege = await Privilege.create({
      name: 'Manage Media',
      description: 'Can manage media files',
      code: 'manage_media',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    });

    // Create roles
    const adminRole = await Role.create({
      name: 'media_admin',
      description: 'Has manage_media privilege',
      privileges: [manageMediaPrivilege._id],
    });

    const viewerRole = await Role.create({
      name: 'media_viewer',
      description: 'Does not have manage_media privilege',
      privileges: [],
    });

    // Create users
    adminUser = await User.create({
      username: 'mediaadmin',
      email: 'mediaadmin@test.com',
      password: 'Password#12345!',
      role: adminRole._id,
    });

    viewerUser = await User.create({
      username: 'mediaviewer',
      email: 'mediaviewer@test.com',
      password: 'Password#12345!',
      role: viewerRole._id,
    });

    // Get tokens for this test
    adminToken = await getAuthToken(app, 'mediaadmin', 'Password#12345!');
    viewerToken = await getAuthToken(app, 'mediaviewer', 'Password#12345!');

    // Create test media
    testMedia = await Media.create({
      filename: 'test.jpg',
      originalName: 'Test Image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      bucket: 'test-bucket',
      key: 'test/test.jpg',
      url: 'http://localhost:9000/test-bucket/test/test.jpg',
      folder: 'test',
      uploadedBy: adminUser._id,
    });
  });

  describe('POST /api/media/upload - RBAC', () => {
    it('should allow user with manage_media privilege to upload', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'upload-test.jpg')
        .field('folder', 'upload-test');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('media');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'forbidden.jpg');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized|insufficient privileges/i);
    });

    it('should deny unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-image-data'), 'noauth.jpg');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/media - RBAC', () => {
    it('should allow user with manage_media privilege to list media', async () => {
      const res = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should deny unauthenticated request', async () => {
      const res = await request(app).get('/api/media');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/media/:id - RBAC', () => {
    it('should allow user with manage_media privilege to get media details', async () => {
      const res = await request(app)
        .get(`/api/media/${testMedia._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .get(`/api/media/${testMedia._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/media/:id - RBAC', () => {
    it('should allow user with manage_media privilege to update metadata', async () => {
      const res = await request(app)
        .put(`/api/media/${testMedia._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ altText: 'Updated alt text' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .put(`/api/media/${testMedia._id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ altText: 'Forbidden update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/media/:id - RBAC', () => {
    it('should allow user with manage_media privilege to delete', async () => {
      // Create fresh media for this test
      const deletableMedia = await Media.create({
        filename: `deletable-${Date.now()}.jpg`,
        originalName: 'Deletable.jpg',
        mimeType: 'image/jpeg',
        size: 512,
        bucket: 'test-bucket',
        key: `test/deletable-${Date.now()}.jpg`,
        url: `http://localhost:9000/test-bucket/test/deletable-${Date.now()}.jpg`,
        folder: 'test',
        uploadedBy: adminUser._id,
      });

      const res = await request(app)
        .delete(`/api/media/${deletableMedia._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });

    it('should deny user without manage_media privilege', async () => {
      // Create fresh media for this test
      const deletableMedia = await Media.create({
        filename: `deletable-forbidden-${Date.now()}.jpg`,
        originalName: 'Deletable Forbidden.jpg',
        mimeType: 'image/jpeg',
        size: 512,
        bucket: 'test-bucket',
        key: `test/deletable-forbidden-${Date.now()}.jpg`,
        url: `http://localhost:9000/test-bucket/test/deletable-forbidden-${Date.now()}.jpg`,
        folder: 'test',
        uploadedBy: adminUser._id,
      });

      const res = await request(app)
        .delete(`/api/media/${deletableMedia._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/media/bulk/delete - RBAC', () => {
    it('should allow user with manage_media privilege to bulk delete', async () => {
      // Create fresh media for this test
      const timestamp = Date.now();
      const bulkMedia = await Media.create([
        {
          filename: `bulk1-${timestamp}.jpg`,
          originalName: 'Bulk 1.jpg',
          mimeType: 'image/jpeg',
          size: 256,
          bucket: 'test-bucket',
          key: `test/bulk1-${timestamp}.jpg`,
          url: `http://localhost:9000/test-bucket/test/bulk1-${timestamp}.jpg`,
          folder: 'test',
          uploadedBy: adminUser._id,
        },
        {
          filename: `bulk2-${timestamp}.jpg`,
          originalName: 'Bulk 2.jpg',
          mimeType: 'image/jpeg',
          size: 256,
          bucket: 'test-bucket',
          key: `test/bulk2-${timestamp}.jpg`,
          url: `http://localhost:9000/test-bucket/test/bulk2-${timestamp}.jpg`,
          folder: 'test',
          uploadedBy: adminUser._id,
        },
      ]);

      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: bulkMedia.map(m => m._id) });

      expect(res.status).toBe(200);
      expect(res.body.deletedCount).toBe(2);
    });

    it('should deny user without manage_media privilege', async () => {
      // Create fresh media for this test
      const timestamp = Date.now();
      const bulkMedia = await Media.create([
        {
          filename: `bulk-forbidden1-${timestamp}.jpg`,
          originalName: 'Bulk Forbidden 1.jpg',
          mimeType: 'image/jpeg',
          size: 256,
          bucket: 'test-bucket',
          key: `test/bulk-forbidden1-${timestamp}.jpg`,
          url: `http://localhost:9000/test-bucket/test/bulk-forbidden1-${timestamp}.jpg`,
          folder: 'test',
          uploadedBy: adminUser._id,
        },
        {
          filename: `bulk-forbidden2-${timestamp}.jpg`,
          originalName: 'Bulk Forbidden 2.jpg',
          mimeType: 'image/jpeg',
          size: 256,
          bucket: 'test-bucket',
          key: `test/bulk-forbidden2-${timestamp}.jpg`,
          url: `http://localhost:9000/test-bucket/test/bulk-forbidden2-${timestamp}.jpg`,
          folder: 'test',
          uploadedBy: adminUser._id,
        },
      ]);

      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ ids: bulkMedia.map(m => m._id) });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/media/stats/storage - RBAC', () => {
    it('should allow user with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/storage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/storage')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/media/stats/folders - RBAC', () => {
    it('should allow user with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/folders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('folders');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/folders')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/media/folders/list - RBAC', () => {
    it('should allow user with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/folders/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('folders');
    });

    it('should deny user without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/folders/list')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('RBAC Summary', () => {
    it('should confirm all routes require manage_media privilege', async () => {
      const routes = [
        { method: 'get', path: '/api/media' },
        { method: 'get', path: `/api/media/${testMedia._id}` },
        { method: 'put', path: `/api/media/${testMedia._id}` },
        { method: 'delete', path: `/api/media/${testMedia._id}` },
        { method: 'post', path: '/api/media/bulk/delete' },
        { method: 'get', path: '/api/media/stats/storage' },
        { method: 'get', path: '/api/media/stats/folders' },
        { method: 'get', path: '/api/media/folders/list' },
      ];

      for (const route of routes) {
        const res = await request(app)
          [route.method](route.path)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({});

        expect(res.status).toBe(403);
      }
    });
  });
});
