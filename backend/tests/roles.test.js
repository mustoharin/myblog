const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken
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

  describe('POST /api/roles', () => {
    it('should validate against XSS in role name', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: '<script>alert("xss")</script>malicious',
          description: 'Test Role',
          privileges: [privileges[0]._id] // Using first available privilege
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
          privileges: [privileges[2]._id, privileges[3]._id] // post privileges
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
          privileges: [privileges[2]._id, privileges[3]._id]
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
          description: 'Updated Admin Role'
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
      const response = await request(app)
        .delete(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('assigned to users');
    });

    it('should allow deletion of unused role by superadmin', async () => {
      // Create a new role
      const newRole = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'test_role',
          description: 'Test Role',
          privileges: []
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
          privileges: []
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
          privileges: []
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
          privileges: ['invalid_id']
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid privilege ID');
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
          privileges: [privileges[0]._id]
        });

      // Update role privileges
      const updateResponse = await request(app)
        .put(`/api/roles/${newRole.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [privileges[1]._id]
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
          privileges: [privileges[0]._id]
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
});