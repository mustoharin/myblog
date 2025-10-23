const request = require('supertest');
const app = require('../server');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
} = require('./setup');

describe('Comment Routes', () => {
  let privileges, roles, superadminUser, adminUser, regularUser, testPost;
  let superadminToken, adminToken, regularToken;

  beforeEach(async () => {
    privileges = await createInitialPrivileges();
    
    // Add comment-specific privileges
    const commentPrivileges = await Privilege.insertMany([
      {
        name: 'Reply Comments',
        code: 'reply_comments',
        description: 'Can reply to comments',
        module: 'user_management',
        moduleDisplayName: 'User Management'
      },
      {
        name: 'Manage Comments',
        code: 'manage_comments',
        description: 'Can moderate comments',
        module: 'user_management',
        moduleDisplayName: 'User Management'
      }
    ]);

    // Update privileges array to include comment privileges
    privileges = [...privileges, ...commentPrivileges];
    
    roles = await createInitialRoles(privileges);
    
    // Add comment privileges to appropriate roles
    await Role.findByIdAndUpdate(roles.superadminRole._id, {
      $push: { privileges: { $each: commentPrivileges.map(p => p._id) } }
    });
    
    await Role.findByIdAndUpdate(roles.adminRole._id, {
      $push: { privileges: { $each: commentPrivileges.map(p => p._id) } }
    });
    
    await Role.findByIdAndUpdate(roles.regularRole._id, {
      $push: { privileges: commentPrivileges[0]._id } // Only reply privilege
    });

    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);
    regularUser = await createTestUser('regular', roles.regularRole._id);

    // Create test post
    testPost = await Post.create({
      title: 'Test Post for Comments',
      content: 'This is a test post for comment testing',
      author: superadminUser._id,
      status: 'published'
    });

    // Get authentication tokens
    const bypassToken = process.env.TEST_BYPASS_CAPTCHA_TOKEN;

    const superadminAuth = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'superadmin',
        password: 'Password#12345!',
        testBypassToken: bypassToken
      });
    superadminToken = superadminAuth.body.token;

    const adminAuth = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Password#12345!',
        testBypassToken: bypassToken
      });
    adminToken = adminAuth.body.token;

    const regularAuth = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'regular',
        password: 'Password#12345!',
        testBypassToken: bypassToken
      });
    regularToken = regularAuth.body.token;
  });

  afterEach(async () => {
    await Comment.deleteMany({});
    await Post.deleteMany({});
  });

  describe('GET /api/comments/post/:postId', () => {
    beforeEach(async () => {
      // Create test comments
      await Comment.create({
        content: 'Approved comment',
        author: { user: regularUser._id },
        post: testPost._id,
        status: 'approved'
      });

      await Comment.create({
        content: 'Pending comment',
        author: { name: 'Anonymous', email: 'anon@example.com' },
        post: testPost._id,
        status: 'pending'
      });

      await Comment.create({
        content: 'Rejected comment',
        author: { name: 'Rejected User', email: 'rejected@example.com' },
        post: testPost._id,
        status: 'rejected'
      });
    });

    it('should get approved comments for unauthenticated users', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].content).toBe('Approved comment');
    });

    it('should get all comments for admin users', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost._id}?status=all`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comments.length).toBeGreaterThan(1);
    });

    it('should return 404 for non-existent post', async () => {
      const fakePostId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/comments/post/${fakePostId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    it('should paginate comments correctly', async () => {
      // Create more comments for pagination
      for (let i = 0; i < 25; i++) {
        await Comment.create({
          content: `Comment ${i}`,
          author: { name: `User${i}`, email: `user${i}@example.com` },
          post: testPost._id,
          status: 'approved'
        });
      }

      const response = await request(app)
        .get(`/api/comments/post/${testPost._id}?page=2&limit=10`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
    });
  });

  describe('POST /api/comments', () => {
    it('should create comment from anonymous visitor', async () => {
      const commentData = {
        content: 'This is a test comment from visitor',
        postId: testPost._id,
        authorName: 'Test Visitor',
        authorEmail: 'visitor@example.com',
        authorWebsite: 'https://example.com',
        testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.content).toBe(commentData.content);
      expect(response.body.comment.author.name).toBe(commentData.authorName);
      expect(response.body.comment.status).toBe('pending');
    });

    it('should create comment from authenticated user', async () => {
      const commentData = {
        content: 'This is a test comment from authenticated user',
        postId: testPost._id
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.content).toBe(commentData.content);
      expect(response.body.comment.author.user).toBeDefined();
      expect(response.body.comment.status).toBe('approved');
    });

    it('should require content and postId', async () => {
      const response = await request(app)
        .post('/api/comments')
        .send({
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content and post ID are required');
    });

    it('should require name and email for anonymous comments', async () => {
      const commentData = {
        content: 'Test comment',
        postId: testPost._id,
        testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate XSS content', async () => {
      const commentData = {
        content: '<script>alert("xss")</script>',
        postId: testPost._id,
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Comment contains invalid content');
    });

    it('should return 404 for non-existent post', async () => {
      const fakePostId = '507f1f77bcf86cd799439011';
      const commentData = {
        content: 'Test comment',
        postId: fakePostId,
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('POST /api/comments/reply/:commentId', () => {
    let parentComment;

    beforeEach(async () => {
      parentComment = await Comment.create({
        content: 'Parent comment',
        author: { name: 'Parent Author', email: 'parent@example.com' },
        post: testPost._id,
        status: 'approved'
      });
    });

    it('should allow authenticated user to reply to comment', async () => {
      const replyData = {
        content: 'This is a reply to the parent comment'
      };

      const response = await request(app)
        .post(`/api/comments/reply/${parentComment._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.content).toBe(replyData.content);
      expect(response.body.comment.parentComment.toString()).toBe(parentComment._id.toString());
    });

    it('should require authentication for replies', async () => {
      const replyData = {
        content: 'This is a reply attempt without auth'
      };

      const response = await request(app)
        .post(`/api/comments/reply/${parentComment._id}`)
        .send(replyData);

      expect(response.status).toBe(401);
    });

    it('should require reply permission', async () => {
      // Create user without reply permission
      const noPermissionRole = await Role.create({
        name: 'nopermission',
        description: 'No Permission Role',
        privileges: []
      });

      const noPermissionUser = await createTestUser('nopermission', noPermissionRole._id);

      const noPermissionAuth = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nopermission',
          password: 'Password#12345!',
          testBypassToken: process.env.TEST_BYPASS_CAPTCHA_TOKEN
        });

      const replyData = {
        content: 'This is a reply attempt without permission'
      };

      const response = await request(app)
        .post(`/api/comments/reply/${parentComment._id}`)
        .set('Authorization', `Bearer ${noPermissionAuth.body.token}`)
        .send(replyData);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = '507f1f77bcf86cd799439011';
      const replyData = {
        content: 'Reply to non-existent comment'
      };

      const response = await request(app)
        .post(`/api/comments/reply/${fakeCommentId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(replyData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Parent comment not found');
    });
  });

  describe('PATCH /api/comments/:id/status', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Test comment for moderation',
        author: { name: 'Test User', email: 'test@example.com' },
        post: testPost._id,
        status: 'pending'
      });
    });

    it('should allow admin to approve comment', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.status).toBe('approved');
    });

    it('should allow admin to reject comment', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.status).toBe('rejected');
    });

    it('should allow admin to mark comment as spam', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'spam' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comment.status).toBe('spam');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .send({ status: 'approved' });

      expect(response.status).toBe(401);
    });

    it('should require moderation permission', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ status: 'approved' });

      expect(response.status).toBe(403);
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch(`/api/comments/${testComment._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Test comment for deletion',
        author: { name: 'Test User', email: 'test@example.com' },
        post: testPost._id,
        status: 'approved'
      });
    });

    it('should allow admin to delete comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment deleted successfully');

      // Verify comment is deleted
      const deletedComment = await Comment.findById(testComment._id);
      expect(deletedComment).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testComment._id}`);

      expect(response.status).toBe(401);
    });

    it('should require moderation permission', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Comment not found');
    });
  });

  describe('GET /api/comments/admin/all', () => {
    beforeEach(async () => {
      // Create comments with different statuses
      await Comment.insertMany([
        {
          content: 'Approved comment',
          author: { name: 'User1', email: 'user1@example.com' },
          post: testPost._id,
          status: 'approved'
        },
        {
          content: 'Pending comment',
          author: { name: 'User2', email: 'user2@example.com' },
          post: testPost._id,
          status: 'pending'
        },
        {
          content: 'Rejected comment',
          author: { name: 'User3', email: 'user3@example.com' },
          post: testPost._id,
          status: 'rejected'
        }
      ]);
    });

    it('should get all comments for admin', async () => {
      const response = await request(app)
        .get('/api/comments/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comments).toHaveLength(3);
    });

    it('should filter comments by status', async () => {
      const response = await request(app)
        .get('/api/comments/admin/all?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].status).toBe('pending');
    });

    it('should search comments by content', async () => {
      const response = await request(app)
        .get('/api/comments/admin/all?search=approved')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].content).toContain('Approved');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/comments/admin/all');

      expect(response.status).toBe(401);
    });

    it('should require moderation permission', async () => {
      const response = await request(app)
        .get('/api/comments/admin/all')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/comments/admin/bulk-action', () => {
    let comments;

    beforeEach(async () => {
      comments = await Comment.insertMany([
        {
          content: 'Comment 1',
          author: { name: 'User1', email: 'user1@example.com' },
          post: testPost._id,
          status: 'pending'
        },
        {
          content: 'Comment 2',
          author: { name: 'User2', email: 'user2@example.com' },
          post: testPost._id,
          status: 'pending'
        },
        {
          content: 'Comment 3',
          author: { name: 'User3', email: 'user3@example.com' },
          post: testPost._id,
          status: 'pending'
        }
      ]);
    });

    it('should approve multiple comments', async () => {
      const commentIds = comments.map(c => c._id);
      
      const response = await request(app)
        .patch('/api/comments/admin/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commentIds,
          action: 'approve'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.updatedCount).toBe(3);

      // Verify all comments are approved
      const updatedComments = await Comment.find({ _id: { $in: commentIds } });
      updatedComments.forEach(comment => {
        expect(comment.status).toBe('approved');
      });
    });

    it('should delete multiple comments', async () => {
      const commentIds = comments.map(c => c._id);
      
      const response = await request(app)
        .patch('/api/comments/admin/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commentIds,
          action: 'delete'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBe(3);

      // Verify all comments are deleted
      const remainingComments = await Comment.find({ _id: { $in: commentIds } });
      expect(remainingComments).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/comments/admin/bulk-action')
        .send({
          commentIds: [comments[0]._id],
          action: 'approve'
        });

      expect(response.status).toBe(401);
    });

    it('should require moderation permission', async () => {
      const response = await request(app)
        .patch('/api/comments/admin/bulk-action')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          commentIds: [comments[0]._id],
          action: 'approve'
        });

      expect(response.status).toBe(403);
    });

    it('should validate action type', async () => {
      const response = await request(app)
        .patch('/api/comments/admin/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commentIds: [comments[0]._id],
          action: 'invalid_action'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/comments/admin/stats', () => {
    beforeEach(async () => {
      await Comment.insertMany([
        {
          content: 'Approved 1',
          author: { name: 'User1', email: 'user1@example.com' },
          post: testPost._id,
          status: 'approved'
        },
        {
          content: 'Approved 2',
          author: { name: 'User2', email: 'user2@example.com' },
          post: testPost._id,
          status: 'approved'
        },
        {
          content: 'Pending 1',
          author: { name: 'User3', email: 'user3@example.com' },
          post: testPost._id,
          status: 'pending'
        },
        {
          content: 'Rejected 1',
          author: { name: 'User4', email: 'user4@example.com' },
          post: testPost._id,
          status: 'rejected'
        },
        {
          content: 'Spam 1',
          author: { name: 'User5', email: 'user5@example.com' },
          post: testPost._id,
          status: 'spam'
        }
      ]);
    });

    it('should get comment statistics for admin', async () => {
      const response = await request(app)
        .get('/api/comments/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.total).toBe(5);
      expect(response.body.stats.approved).toBe(2);
      expect(response.body.stats.pending).toBe(1);
      expect(response.body.stats.rejected).toBe(1);
      expect(response.body.stats.spam).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/comments/admin/stats');

      expect(response.status).toBe(401);
    });

    it('should require moderation permission', async () => {
      const response = await request(app)
        .get('/api/comments/admin/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });
});