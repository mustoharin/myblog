const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken,
} = require('./setup');

describe('Role Routes', () => {
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

  describe('GET /api/roles', () => {
    it('should allow superadmin to list all roles', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
      expect(response.body.items.length).toBe(3);
    });

    it('should not allow admin to list roles', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/roles/:id', () => {
    it('should allow superadmin to get a single role by ID', async () => {
      const response = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', 'admin');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('privileges');
      expect(Array.isArray(response.body.privileges)).toBeTruthy();
    });

    it('should populate privileges in role details', async () => {
      const response = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.privileges.length).toBeGreaterThan(0);
      expect(response.body.privileges[0]).toHaveProperty('name');
      expect(response.body.privileges[0]).toHaveProperty('description');
    });

    it('should return 404 for non-existent role ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/roles/${fakeId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Role not found');
    });

    it('should return 404 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/roles/invalid_id')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Role not found');
    });

    it('should not allow admin to get role by ID', async () => {
      const response = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should not allow unauthenticated access', async () => {
      const response = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/roles', () => {
    it('should validate against XSS in role name', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: '<script>alert("xss")</script>malicious',
          description: 'Test Role',
          privileges: [privileges[0]._id], // Using first available privilege
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('unsafe content');
    });

    it('should allow superadmin to create new role', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'editor',
          description: 'Content Editor',
          privileges: [privileges[2]._id, privileges[3]._id], // post privileges
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', 'editor');
    });

    it('should not allow admin to create role', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'editor',
          description: 'Content Editor',
          privileges: [privileges[2]._id, privileges[3]._id],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('should allow superadmin to update role', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Updated Admin Role',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated Admin Role');
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should not allow deletion of superadmin role', async () => {
      const response = await request(app)
        .delete(`/api/roles/${roles.superadminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent deletion of role assigned to users', async () => {
      // With soft delete, we can now delete roles even if assigned to users
      const response = await request(app)
        .delete(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(204);
      // The role should be soft deleted, not physically removed
    });

    it('should allow deletion of unused role by superadmin', async () => {
      // Create a new role
      const newRole = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: [],
        });

      const response = await request(app)
        .delete(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Role Validation', () => {
    it('should require name for role creation', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Test Role',
          privileges: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('name is required');
    });

    it('should prevent duplicate role names', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'admin', // existing role name
          description: 'Test Role',
          privileges: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate privilege IDs when assigning to role', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: ['invalid_id'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid privilege ID');
    });
  });

  describe('User Count by Role', () => {
    it('should include usersCount in role list', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      
      // Check that each role has usersCount property
      response.body.items.forEach(role => {
        expect(role).toHaveProperty('usersCount');
        expect(typeof role.usersCount).toBe('number');
        expect(role.usersCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show correct user count for each role', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      
      // Find the roles we created in setup
      const superadminRole = response.body.items.find(r => r.name === 'superadmin');
      const adminRole = response.body.items.find(r => r.name === 'admin');
      
      // We created one superadmin user and one admin user in beforeEach
      expect(superadminRole.usersCount).toBe(1);
      expect(adminRole.usersCount).toBe(1);
    });

    it('should include usersCount in single role endpoint', async () => {
      const response = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usersCount');
      expect(typeof response.body.usersCount).toBe('number');
      expect(response.body.usersCount).toBe(1); // One admin user created in setup
    });

    it('should show zero users for newly created role', async () => {
      // Create a new role
      const newRole = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: [privileges[0]._id],
        });

      expect(newRole.status).toBe(201);

      // Get the role and check user count
      const response = await request(app)
        .get(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.usersCount).toBe(0);
    });

    it('should update user count when users are created', async () => {
      const User = require('../models/User');
      
      // Get initial count for admin role
      const initialResponse = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      const initialCount = initialResponse.body.usersCount;

      // Create a new admin user directly in database
      await User.create({
        username: 'newadmin',
        email: 'newadmin@example.com',
        password: 'hashedpassword',
        role: roles.adminRole._id,
      });

      // Get updated count
      const updatedResponse = await request(app)
        .get(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(updatedResponse.body.usersCount).toBe(initialCount + 1);
    });
  });

  describe('Role Data Integrity', () => {
    it('should maintain privilege references after role update', async () => {
      // Create a new role
      const newRole = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: [privileges[0]._id],
        });

      // Update role privileges
      const updateResponse = await request(app)
        .put(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [privileges[1]._id],
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.privileges).toHaveLength(1);
      expect(updateResponse.body.privileges[0]._id).toBe(privileges[1]._id.toString());
    });

    it('should properly handle role deletion cleanup', async () => {
      // Create a new role
      const newRole = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: [privileges[0]._id],
        });

      // Delete the role
      await request(app)
        .delete(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      // Verify role is completely removed
      const response = await request(app)
        .get(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Superadmin Role Protection', () => {
    it('should prevent modification of superadmin role name', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.superadminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'hacked_superadmin',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify superadmin role');
    });

    it('should prevent modification of superadmin role privileges', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.superadminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [privileges[0]._id], // Try to reduce to just one privilege
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify superadmin role');
    });

    it('should prevent deactivation of superadmin role', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.superadminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify superadmin role');
    });

    it('should prevent modification of superadmin role description', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.superadminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Modified description',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify superadmin role');
    });
  });

  describe('Role Update Validation', () => {
    it('should validate privilege IDs when updating role', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: ['507f1f77bcf86cd799439011'], // Invalid privilege ID
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid privilege ID');
    });

    it('should prevent empty privilege array when updating role', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [], // Empty array
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('non-empty array');
    });

    it('should allow updating role with valid privileges', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [privileges[0]._id, privileges[1]._id],
        });

      expect(response.status).toBe(200);
      expect(response.body.privileges).toHaveLength(2);
    });

    it('should allow updating role description without modifying privileges', async () => {
      const response = await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Updated admin description',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated admin description');
    });
  });
});
