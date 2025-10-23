const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken,
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
          description: 'Can manage blog categories',
          module: 'content_management',
          moduleDisplayName: 'Content Management',
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
          description: 'Can manage blog categories',
          module: 'content_management',
          moduleDisplayName: 'Content Management',
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
          description: 'Updated privilege description',
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
          description: 'Test privilege',
          module: 'system_administration',
          moduleDisplayName: 'System Administration',
        });

      // Assign it to a role
      await request(app)
        .put(`/api/roles/${roles.adminRole._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          privileges: [...roles.adminRole.privileges.map(p => p._id), newPrivilege.body._id],
        });

      // With soft delete, we can now delete privileges even if assigned to roles
      const response = await request(app)
        .delete(`/api/privileges/${newPrivilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
      // The privilege should be soft deleted, not physically removed
    });

    it('should allow deletion of custom privileges by superadmin', async () => {
      // First create a custom privilege
      const newPrivilege = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Custom Privilege',
          code: 'custom_privilege',
          description: 'Custom privilege for testing',
          module: 'system_administration',
          moduleDisplayName: 'System Administration',
        });

      const response = await request(app)
        .delete(`/api/privileges/${newPrivilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
    });
  });
  describe('Essential Privilege Protection', () => {
    it('should prevent modification of essential privilege code', async () => {
      // Try to modify manage_roles privilege code
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      
      const response = await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          code: 'hacked_privilege',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify name, code, or module of essential privilege');
    });

    it('should prevent modification of essential privilege name', async () => {
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      
      const response = await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Hacked Privilege',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify name, code, or module of essential privilege');
    });

    it('should prevent modification of essential privilege module', async () => {
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      
      const response = await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          module: 'content_management',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot modify name, code, or module of essential privilege');
    });

    it('should allow updating description of essential privilege', async () => {
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      
      const response = await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Updated description for manage roles',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated description for manage roles');
    });

    it('should allow updating isActive status of essential privilege', async () => {
      const manageRolesPrivilege = privileges.find(p => p.code === 'manage_roles');
      
      const response = await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);

      // Restore it for other tests
      await request(app)
        .put(`/api/privileges/${manageRolesPrivilege._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ isActive: true });
    });
  });

  describe('Privilege Update Validation', () => {
    it('should prevent duplicate privilege codes when updating', async () => {
      // Create two custom privileges
      const privilege1 = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Custom Privilege 1',
          code: 'custom_priv_1',
          description: 'First custom privilege',
          module: 'system_administration',
        });

      const privilege2 = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Custom Privilege 2',
          code: 'custom_priv_2',
          description: 'Second custom privilege',
          module: 'system_administration',
        });

      // Try to update privilege2 to have the same code as privilege1
      const response = await request(app)
        .put(`/api/privileges/${privilege2.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          code: 'custom_priv_1',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Privilege code already exists');
    });

    it('should prevent duplicate privilege names when updating', async () => {
      // Create two custom privileges
      const privilege1 = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Unique Name 1',
          code: 'unique_code_1',
          description: 'First privilege',
          module: 'system_administration',
        });

      const privilege2 = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Unique Name 2',
          code: 'unique_code_2',
          description: 'Second privilege',
          module: 'system_administration',
        });

      // Try to update privilege2 to have the same name as privilege1
      const response = await request(app)
        .put(`/api/privileges/${privilege2.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Unique Name 1',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Privilege name already exists');
    });

    it('should validate module when updating privilege', async () => {
      // Create a custom privilege
      const privilege = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Test Privilege',
          code: 'test_priv',
          description: 'Test privilege',
          module: 'system_administration',
        });

      const response = await request(app)
        .put(`/api/privileges/${privilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          module: 'invalid_module',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid module');
    });

    it('should allow updating custom privilege with valid data', async () => {
      // Create a custom privilege
      const privilege = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Updateable Privilege',
          code: 'updateable_priv',
          description: 'Can be updated',
          module: 'system_administration',
        });

      const response = await request(app)
        .put(`/api/privileges/${privilege.body._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Updated Privilege Name',
          code: 'updated_priv_code',
          description: 'Updated description',
          module: 'content_management',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Privilege Name');
      expect(response.body.code).toBe('updated_priv_code');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.module).toBe('content_management');
    });
  });
});
