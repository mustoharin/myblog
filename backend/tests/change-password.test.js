const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getAuthToken,
} = require('./setup');

describe('Change Password', () => {
  let user, userToken, roles;

  beforeEach(async () => {
    // Setup initial data
    const privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    
    // Create test user
    user = await createTestUser('passworduser', roles.regularRole._id);
    
    // Get auth token
    userToken = await getAuthToken(app, 'passworduser', 'Password#12345!');
  });

  describe('POST /api/password/change', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password#12345!',
          newPassword: 'NewStr0ngP@ssphrase!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify old password no longer works
      // Get CAPTCHA token for first login attempt
      const captchaResponse1 = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'passworduser',
          password: 'Password#12345!',
          captchaText: '123456',
          captchaSessionId: captchaResponse1.body.sessionId,
        });

      expect(loginResponse.status).toBe(401);

      // Get CAPTCHA token for second login attempt
      const captchaResponse2 = await request(app)
        .get('/api/auth/captcha')
        .expect(200);

      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'passworduser',
          password: 'NewStr0ngP@ssphrase!',
          captchaText: '123456',
          captchaSessionId: captchaResponse2.body.sessionId,
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body.token).toBeTruthy();
    });

    it('should require current password', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newPassword: 'NewPassword#54321!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Current password');
    });

    // Concurrent password changes are tested in a separate test below

    it('should require new password', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password#12345!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('new password');
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword#123!',
          newPassword: 'NewPassword#54321!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('incorrect');
    });

    it('should validate new password complexity', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password#12345!',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeTruthy();
      expect(response.body.requirements).toBeTruthy();
    });

    it('should require new password to be different', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password#12345!',
          newPassword: 'Password#12345!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('different');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/password/change')
        .send({
          currentPassword: 'Password#12345!',
          newPassword: 'NewPassword#54321!',
        });

      expect(response.status).toBe(401);
    });
  });
});