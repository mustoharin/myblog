const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken
} = require('./setup');

describe('Privilege Routes', () => {
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

  describe('GET /api/privileges', () => {
    it('should allow superadmin to list all privileges', async () => {
      const response = await request(app)
        .get('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
      expect(response.body.items.length).toBe(10);
    });

    it('should not allow admin to list privileges', async () => {
      const response = await request(app)
        .get('/api/privileges')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/privileges', () => {
    it('should allow superadmin to create new privilege', async () => {
      const response = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Manage Categories',
          code: 'manage_categories',
          description: 'Can manage blog categories'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', 'Manage Categories');
      expect(response.body).toHaveProperty('code', 'manage_categories');
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('code', 'manage_categories');
    });

    it('should not allow admin to create privilege', async () => {
      const response = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Manage Categories',
          code: 'manage_categories',
          description: 'Can manage blog categories'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/privileges/:id', () => {
    it('should allow superadmin to update privilege', async () => {
      const response = await request(app)
        .put(`/api/privileges/${privileges[0]._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Updated privilege description'
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated privilege description');
    });
  });

  describe('DELETE /api/privileges/:id', () => {
    it('should not allow deletion of essential privileges', async () => {
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      const response = await request(app)
        .delete(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent deletion of privilege assigned to roles', async () => {
      // Create a new privilege
      const newPrivilege = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Test Privilege',
          code: 'test_privilege',
          description: 'Test privilege'
        });

      // Assign it to a role
      await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [...roles.adminRole.privileges.map(p => p._id), newPrivilege.body._id]
        });

      // Try to delete the privilege
      const response = await request(app)
        .delete(`/api/privileges/${newPrivilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('assigned to roles');
    });

    it('should allow deletion of custom privileges by superadmin', async () => {
      // First create a custom privilege
      const newPrivilege = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Custom Privilege',
          code: 'custom_privilege',
          description: 'Custom privilege for testing'
        });

      const response = await request(app)
        .delete(`/api/privileges/${newPrivilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
    });
  });
});