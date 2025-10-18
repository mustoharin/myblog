const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getAuthToken,
} = require('./setup');
const User = require('../models/User');

describe('Input Trimming', () => {
  let privileges, roles, regularUser, adminToken, superadminToken;

  beforeEach(async () => {
    // Setup initial data
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    regularUser = await createTestUser('testuser', roles.regularRole._id);
    await createTestUser('admin', roles.adminRole._id);
    await createTestUser('superadmin', roles.superadminRole._id);

    // Get tokens with mock CAPTCHA
    adminToken = await getAuthToken(app, 'admin', 'Password#12345!');
    superadminToken = await getAuthToken(app, 'superadmin', 'Password#12345!');
  });

  describe('Auth Routes', () => {
    it('should trim username and password in login', async () => {
      // First get CAPTCHA
      const captchaResponse = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '  testuser  ',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse.body.sessionId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should trim inputs in user creation', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: '  newuser  ',
          email: '  user@test.com  ',
          password: 'Password#12345!',
          role: roles.regularRole._id,
        });

      expect(response.status).toBe(201);
      expect(response.body.username).toBe('newuser');
      expect(response.body.email).toBe('user@test.com');

      // Verify in database
      const user = await User.findById(response.body._id);
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('user@test.com');
    });
  });

  describe('User Update Routes', () => {
    it('should trim inputs in user update', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          username: '  updateduser  ',
          email: '  updated@test.com  ',
        });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('updateduser');
      expect(response.body.email).toBe('updated@test.com');

      // Verify in database
      const user = await User.findById(regularUser._id);
      expect(user.username).toBe('updateduser');
      expect(user.email).toBe('updated@test.com');
    });
  });

  describe('Role and Privilege Routes', () => {
    it('should trim inputs in role creation', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: '  newrole  ',
          description: '  New role description  ',
          privileges: [privileges[0]._id],
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('newrole');
      expect(response.body.description).toBe('New role description');
    });

    it('should trim inputs in privilege creation', async () => {
      const response = await request(app)
        .post('/api/privileges')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: '  newprivilege  ',
          code: '  new_privilege  ',
          description: '  New privilege description  ',
          module: '  user_management  ',
          moduleDisplayName: '  User Management  ',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('newprivilege');
      expect(response.body.code).toBe('new_privilege');
      expect(response.body.description).toBe('New privilege description');
      expect(response.body.module).toBe('user_management');
      expect(response.body.moduleDisplayName).toBe('User Management');
    });
  });
});