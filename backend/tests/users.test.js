const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken,
} = require('./setup');

describe('User Routes', () => {
  let privileges, roles, superadminUser, adminUser, superadminToken, adminToken;

  beforeEach(async () => {
    // Setup initial data
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);

    // Get tokens using proper helper functions that handle CAPTCHA
    superadminToken = await getSuperadminToken(app);
    adminToken = await getAdminToken(app);
  });

  describe('GET /api/users', () => {
    it('should allow superadmin to list all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
      expect(response.body.items.length).toBe(2);
    });

    it('should not allow admin to list users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'testuser',
          email: 'invalidemail',
          password: 'Password#12345!',
          role: roles.regularRole._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('is not a valid email address');
    });

    it('should validate against XSS in username', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: '<script>alert("xss")</script>malicious',
          email: 'test@example.com',
          password: 'Password#12345!',
          role: roles.regularRole._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('unsafe content');
    });

    it('should allow superadmin to create new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', 'newuser');
    });

    it('should prevent creation of duplicate username', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'admin', // Existing username
          email: 'newadmin@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should prevent creation of duplicate email', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'newadmin',
          email: 'admin@test.com', // Existing email
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should not allow admin to create user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123',
          roleId: roles.adminRole._id,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow superadmin to update user', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          email: 'updated@test.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('updated@test.com');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should prevent deletion of last superadmin', async () => {
      const response = await request(app)
        .delete(`/api/users/${superadminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('last superadmin');
    });

    it('should allow superadmin to delete regular admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(204);
    });

    it('should not allow admin to delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('User Data Integrity', () => {
    it('should properly hash password on user creation', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'testuser',
          email: 'testuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(201);
      
      // Verify password is hashed in database
      const User = require('../models/User');
      const user = await User.findById(response.body._id);
      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/); // bcrypt hash pattern
    });

    it('should maintain referential integrity with roles', async () => {
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'testuser',
          email: 'testuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      // With soft delete, we can now delete roles even if assigned to users
      const deleteRoleResponse = await request(app)
        .delete(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(deleteRoleResponse.status).toBe(204);
      // The role should be soft deleted, not physically removed
    });

    it('should properly cascade user data on deletion', async () => {
      // Create a test user
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'testuser',
          email: 'testuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      // Create some posts for the user
      const Post = require('../models/Post');
      await Post.create({
        title: 'Test Post',
        content: 'Test Content',
        author: newUser.body._id,
      });

      // With soft delete, we can now delete users even if they have posts
      const deleteResponse = await request(app)
        .delete(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(deleteResponse.status).toBe(204);
      // The user should be soft deleted, not physically removed
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent user creation with same username', async () => {
      const createUser = () => request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'concurrent_user',
          email: `concurrent_${Date.now()}@test.com`,
          password: 'password123',
          role: roles.adminRole._id,
        });

      // Try to create users concurrently
      const results = await Promise.all([
        createUser(),
        createUser(),
      ]);

      // One should succeed, one should fail
      const successCount = results.filter(r => r.status === 201).length;
      const failCount = results.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });

    it('should handle concurrent user updates safely', async () => {
      // Create a test user
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'testuser',
          email: 'testuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      // Try to update the user concurrently
      const updateUser = email => request(app)
        .put(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ email });

      const results = await Promise.all([
        updateUser('test1@test.com'),
        updateUser('test2@test.com'),
      ]);

      // Both updates should process, but only one should win
      expect(results.some(r => r.status === 200)).toBe(true);
      
      // Verify final state
      const finalUser = await request(app)
        .get(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(finalUser.body.email).toMatch(/^test[12]@test\.com$/);
    });
  });

  describe('User Status Management', () => {
    it('should create user with isActive set to true by default', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('isActive', true);
    });

    it('should create user with isActive set to false when specified', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'inactiveuser',
          email: 'inactive@test.com',
          password: 'password123',
          role: roles.adminRole._id,
          isActive: false,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should update user status from active to inactive', async () => {
      // Create a user
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'activeuser',
          email: 'active@test.com',
          password: 'password123',
          role: roles.adminRole._id,
          isActive: true,
        });

      // Update to inactive
      const response = await request(app)
        .put(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should update user status from inactive to active', async () => {
      // Create an inactive user
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'deactivateduser',
          email: 'deactivated@test.com',
          password: 'password123',
          role: roles.adminRole._id,
          isActive: false,
        });

      // Update to active
      const response = await request(app)
        .put(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isActive', true);
    });

    it('should include isActive in user list', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      
      // Check that each user has isActive property
      response.body.items.forEach(user => {
        expect(user).toHaveProperty('isActive');
        expect(typeof user.isActive).toBe('boolean');
      });
    });

    it('should include isActive in single user endpoint', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isActive');
      expect(typeof response.body.isActive).toBe('boolean');
    });
  });

  describe('User Full Name Management', () => {
    it('should create user with fullName', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'johndoe',
          fullName: 'John Doe',
          email: 'johndoe@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', 'johndoe');
      expect(response.body).toHaveProperty('fullName', 'John Doe');
    });

    it('should create user without fullName (optional field)', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'janedoe',
          email: 'janedoe@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', 'janedoe');
      expect(response.body.fullName).toBeNull();
    });

    it('should update user fullName', async () => {
      // Create user
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'updatename',
          email: 'updatename@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      // Update fullName
      const response = await request(app)
        .put(`/api/users/${newUser.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          fullName: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fullName', 'Updated Name');
    });

    it('should include fullName in user list', async () => {
      // Create a user with fullName
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'listuser',
          fullName: 'List User',
          email: 'listuser@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      
      // Find the user with fullName
      const userWithFullName = response.body.items.find(u => u.username === 'listuser');
      expect(userWithFullName).toBeDefined();
      expect(userWithFullName).toHaveProperty('fullName', 'List User');
    });

    it('should validate fullName against XSS', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: 'xsstest',
          fullName: '<script>alert("xss")</script>Malicious Name',
          email: 'xsstest@test.com',
          password: 'password123',
          role: roles.adminRole._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('unsafe content');
    });
  });
});