const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const Media = require('../models/Media');
const Activity = require('../models/Activity');
const { uploadFile, deleteFile } = require('../config/minio');
const { getAuthToken } = require('./setup');

// Mock MinIO functions
jest.mock('../config/minio', () => ({
  bucketName: 'test-bucket',
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  fileExists: jest.fn(),
  initBucket: jest.fn(),
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

describe('Media Routes', () => {
  let adminToken;
  let editorToken;
  let viewerToken;
  let adminUser;
  let editorUser;
  let viewerUser;
  let adminRole;
  let editorRole;
  let viewerRole;
  let manageMediaPrivilege;
  let testMediaId;

  afterAll(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
    await Privilege.deleteMany({});
    await Media.deleteMany({});
    await Activity.deleteMany({});
  });

  beforeEach(async () => {
    // Clear mock calls
    uploadFile.mockClear();
    deleteFile.mockClear();
    
    // Create manage_media privilege
    manageMediaPrivilege = await Privilege.create({
      name: 'Manage Media',
      description: 'Can manage media files',
      code: 'manage_media',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    });

    // Create roles
    adminRole = await Role.create({
      name: 'mediaadmin',
      description: 'Media Administrator',
      privileges: [manageMediaPrivilege._id],
      isSystem: true,
    });

    editorRole = await Role.create({
      name: 'mediaeditor',
      description: 'Media Editor with access',
      privileges: [manageMediaPrivilege._id],
    });

    viewerRole = await Role.create({
      name: 'mediaviewer',
      description: 'Media Viewer without access',
      privileges: [],
    });

    // Create users
    adminUser = await User.create({
      username: 'mediaadmin',
      email: 'mediaadmin@test.com',
      password: 'Password#12345!',
      fullName: 'Media Admin',
      role: adminRole._id,
    });

    editorUser = await User.create({
      username: 'mediaeditor',
      email: 'mediaeditor@test.com',
      password: 'Password#12345!',
      fullName: 'Media Editor',
      role: editorRole._id,
    });

    viewerUser = await User.create({
      username: 'mediaviewer',
      email: 'mediaviewer@test.com',
      password: 'Password#12345!',
      fullName: 'Media Viewer',
      role: viewerRole._id,
    });

    // Get tokens using the helper function (handles CAPTCHA properly)
    adminToken = await getAuthToken(app, 'mediaadmin', 'Password#12345!');
    editorToken = await getAuthToken(app, 'mediaeditor', 'Password#12345!');
    viewerToken = await getAuthToken(app, 'mediaviewer', 'Password#12345!');

    // Mock MinIO upload to return a URL
    uploadFile.mockResolvedValue('http://localhost:9000/test-bucket/test-file.jpg');
  });

  describe('POST /api/media/upload', () => {
    it('should upload an image file successfully with manage_media privilege', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testImageBuffer, 'test-image.jpg')
        .field('folder', 'test-folder')
        .field('altText', 'Test image')
        .field('caption', 'Test caption');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('File uploaded successfully');
      expect(res.body.media).toHaveProperty('id');
      expect(res.body.media).toHaveProperty('filename');
      expect(res.body.media).toHaveProperty('url');
      expect(res.body.media.folder).toBe('test-folder');
      expect(res.body.media.altText).toBe('Test image');
      expect(res.body.media.caption).toBe('Test caption');
      expect(uploadFile).toHaveBeenCalled();

      // Save media ID for later tests
      testMediaId = res.body.media.id;

      // Verify activity was logged
      const activity = await Activity.findOne({ type: 'media_upload' });
      expect(activity).toBeTruthy();
    });

    it('should upload image with editor role (has manage_media)', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', testImageBuffer, 'editor-image.jpg')
        .field('folder', 'editor-files');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('File uploaded successfully');
    });

    it('should reject upload without manage_media privilege', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', testImageBuffer, 'forbidden.jpg');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized|insufficient privileges/i);
    });

    it('should reject upload without authentication', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', testImageBuffer, 'no-auth.jpg');

      expect(res.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'test');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No file uploaded');
    });

    it('should use default folder if not provided', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testImageBuffer, 'default-folder.jpg');

      expect(res.status).toBe(201);
      expect(res.body.media.folder).toBe('uncategorized');
    });
  });

  describe('GET /api/media', () => {
    beforeAll(async () => {
      // Create test media files
      await Media.create([
        {
          filename: 'test1.jpg',
          originalName: 'Test Image 1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          bucket: 'test-bucket',
          key: 'folder1/test1.jpg',
          url: 'http://localhost:9000/test-bucket/folder1/test1.jpg',
          folder: 'folder1',
          altText: 'First test image',
          uploadedBy: adminUser._id,
        },
        {
          filename: 'test2.png',
          originalName: 'Test Image 2.png',
          mimeType: 'image/png',
          size: 2048,
          bucket: 'test-bucket',
          key: 'folder2/test2.png',
          url: 'http://localhost:9000/test-bucket/folder2/test2.png',
          folder: 'folder2',
          altText: 'Second test image',
          uploadedBy: editorUser._id,
        },
        {
          filename: 'test3.pdf',
          originalName: 'Test Document.pdf',
          mimeType: 'application/pdf',
          size: 4096,
          bucket: 'test-bucket',
          key: 'documents/test3.pdf',
          url: 'http://localhost:9000/test-bucket/documents/test3.pdf',
          folder: 'documents',
          uploadedBy: adminUser._id,
        },
      ]);
    });

    it('should list all media with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.media)).toBe(true);
      expect(res.body.media.length).toBeGreaterThan(0);
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter media by folder', async () => {
      const res = await request(app)
        .get('/api/media?folder=folder1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.media.every(m => m.folder === 'folder1')).toBe(true);
    });

    it('should filter media by MIME type', async () => {
      const res = await request(app)
        .get('/api/media?mimeType=image')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.media.every(m => m.mimeType.startsWith('image/'))).toBe(true);
    });

    it('should search media by filename or alt text', async () => {
      const res = await request(app)
        .get('/api/media?search=First')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.media.length).toBeGreaterThan(0);
      expect(
        res.body.media.some(m => 
          m.originalName.includes('First') || m.altText.includes('First')),
      ).toBe(true);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/media?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.media.length).toBeLessThanOrEqual(2);
    });

    it('should reject listing without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject listing without authentication', async () => {
      const res = await request(app).get('/api/media');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/media/:id', () => {
    let mediaId;

    beforeAll(async () => {
      const media = await Media.create({
        filename: 'detail-test.jpg',
        originalName: 'Detail Test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/detail-test.jpg',
        url: 'http://localhost:9000/test-bucket/test/detail-test.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
      });
      mediaId = media._id;
    });

    it('should get single media by ID with manage_media privilege', async () => {
      const res = await request(app)
        .get(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
      expect(res.body.media._id.toString()).toBe(mediaId.toString());
      expect(res.body.media).toHaveProperty('uploadedBy');
    });

    it('should reject getting media without manage_media privilege', async () => {
      const res = await request(app)
        .get(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent media', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Media not found');
    });
  });

  describe('PUT /api/media/:id', () => {
    let mediaId;

    beforeAll(async () => {
      const media = await Media.create({
        filename: 'update-test.jpg',
        originalName: 'Update Test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/update-test.jpg',
        url: 'http://localhost:9000/test-bucket/test/update-test.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
      });
      mediaId = media._id;
    });

    it('should update media metadata with manage_media privilege', async () => {
      const res = await request(app)
        .put(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          altText: 'Updated alt text',
          caption: 'Updated caption',
          folder: 'updated-folder',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Media updated successfully');
      expect(res.body.media.altText).toBe('Updated alt text');
      expect(res.body.media.caption).toBe('Updated caption');
      expect(res.body.media.folder).toBe('updated-folder');

      // Verify activity was logged
      const activity = await Activity.findOne({ type: 'media_update' });
      expect(activity).toBeTruthy();
    });

    it('should reject update without manage_media privilege', async () => {
      const res = await request(app)
        .put(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ altText: 'Forbidden update' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent media', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ altText: 'Update' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/media/:id', () => {
    let mediaId;

    beforeEach(async () => {
      // Clean up any existing media first to avoid duplicate key errors
      await Media.deleteMany({});
      
      const media = await Media.create({
        filename: 'delete-test.jpg',
        originalName: 'Delete Test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/delete-test.jpg',
        url: 'http://localhost:9000/test-bucket/test/delete-test.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
      });
      mediaId = media._id;
      deleteFile.mockResolvedValue(true);
    });

    it('should delete media with manage_media privilege', async () => {
      const res = await request(app)
        .delete(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Media deleted successfully');
      expect(deleteFile).toHaveBeenCalled();

      // Verify soft delete
      const deletedMedia = await Media.findById(mediaId);
      expect(deletedMedia.deletedAt).toBeTruthy();

      // Verify activity was logged
      const activity = await Activity.findOne({ type: 'media_delete' });
      expect(activity).toBeTruthy();
    });

    it('should reject deletion without manage_media privilege', async () => {
      const res = await request(app)
        .delete(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent deletion of media in use', async () => {
      const media = await Media.create({
        filename: 'in-use.jpg',
        originalName: 'In Use.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/in-use.jpg',
        url: 'http://localhost:9000/test-bucket/test/in-use.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
        usedIn: [{ model: 'Post', id: '507f1f77bcf86cd799439011' }],
      });

      const res = await request(app)
        .delete(`/api/media/${media._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot delete.*in use/i);
      expect(res.body).toHaveProperty('usedIn');
    });
  });

  describe('POST /api/media/bulk/delete', () => {
    let mediaIds;

    beforeEach(async () => {
      // Clean up any existing media first to avoid duplicate key errors
      await Media.deleteMany({});
      
      const media1 = await Media.create({
        filename: 'bulk1.jpg',
        originalName: 'Bulk 1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/bulk1.jpg',
        url: 'http://localhost:9000/test-bucket/test/bulk1.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
      });

      const media2 = await Media.create({
        filename: 'bulk2.jpg',
        originalName: 'Bulk 2.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        bucket: 'test-bucket',
        key: 'test/bulk2.jpg',
        url: 'http://localhost:9000/test-bucket/test/bulk2.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
      });

      mediaIds = [media1._id, media2._id];
      deleteFile.mockResolvedValue(true);
    });

    it('should bulk delete media with manage_media privilege', async () => {
      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: mediaIds });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/successfully deleted 2/i);
      expect(res.body.deletedCount).toBe(2);
      expect(deleteFile).toHaveBeenCalled();

      // Verify activity was logged
      const activity = await Activity.findOne({ type: 'media_bulk_delete' });
      expect(activity).toBeTruthy();
    });

    it('should reject bulk delete without manage_media privilege', async () => {
      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ ids: mediaIds });

      expect(res.status).toBe(403);
    });

    it('should reject bulk delete without IDs', async () => {
      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No media IDs provided');
    });

    it('should prevent bulk delete if any media is in use', async () => {
      const inUseMedia = await Media.create({
        filename: 'in-use-bulk.jpg',
        originalName: 'In Use Bulk.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        key: 'test/in-use-bulk.jpg',
        url: 'http://localhost:9000/test-bucket/test/in-use-bulk.jpg',
        folder: 'test',
        uploadedBy: adminUser._id,
        usedIn: [{ model: 'Post', id: '507f1f77bcf86cd799439011' }],
      });

      const res = await request(app)
        .post('/api/media/bulk/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [...mediaIds, inUseMedia._id] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot delete.*in use/i);
      expect(res.body).toHaveProperty('inUse');
    });
  });

  describe('GET /api/media/stats/storage', () => {
    it('should get storage statistics with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/storage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalSize');
      expect(res.body.stats).toHaveProperty('totalFiles');
      expect(res.body.stats).toHaveProperty('totalSizeFormatted');
    });

    it('should reject stats without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/storage')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/media/stats/folders', () => {
    it('should get folder statistics with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/folders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('folders');
      expect(Array.isArray(res.body.folders)).toBe(true);
      
      if (res.body.folders.length > 0) {
        expect(res.body.folders[0]).toHaveProperty('folder');
        expect(res.body.folders[0]).toHaveProperty('count');
        expect(res.body.folders[0]).toHaveProperty('totalSize');
        expect(res.body.folders[0]).toHaveProperty('totalSizeFormatted');
      }
    });

    it('should reject folder stats without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/stats/folders')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/media/folders/list', () => {
    it('should list all folders with manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/folders/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('folders');
      expect(Array.isArray(res.body.folders)).toBe(true);
    });

    it('should reject folder list without manage_media privilege', async () => {
      const res = await request(app)
        .get('/api/media/folders/list')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('RBAC Edge Cases', () => {
    it('should reject all media operations with invalid token', async () => {
      const endpoints = [
        { method: 'get', path: '/api/media' },
        { method: 'get', path: '/api/media/stats/storage' },
        { method: 'post', path: '/api/media/upload' },
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
      }
    });

    it('should allow editor with manage_media to perform all operations', async () => {
      // Upload
      const uploadRes = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('test'), 'editor-test.jpg');

      expect(uploadRes.status).toBe(201);

      // List
      const listRes = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(listRes.status).toBe(200);

      // Stats
      const statsRes = await request(app)
        .get('/api/media/stats/storage')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(statsRes.status).toBe(200);
    });
  });
});
