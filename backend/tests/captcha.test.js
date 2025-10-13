const request = require('supertest');
const app = require('../server');
const mockCaptcha = require('../utils/mockCaptcha');
const { createTestUser, createInitialPrivileges, createInitialRoles } = require('./setup');

describe('CAPTCHA and Authentication', () => {
  let testUser;

  beforeEach(async () => {
    // Setup initial data
    const privileges = await createInitialPrivileges();
    const roles = await createInitialRoles(privileges);
    
    // Create test user
    testUser = await createTestUser('testuser', roles.regularRole._id);
    
    // Reset mockCaptcha state
    mockCaptcha.setValidToken(null);
  });

  describe('GET /api/auth/captcha', () => {
    it('should return a captcha session and image', async () => {
      const response = await request(app)
        .get('/api/auth/captcha');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('imageDataUrl');
    });
  });

  describe('POST /api/auth/login with CAPTCHA', () => {
    beforeEach(() => {
      mockCaptcha.validationTokens.clear();
      mockCaptcha.sessions.clear();
      mockCaptcha.usedSessions.clear();
    });

    it('should return 400 if no captcha validation is provided', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('CAPTCHA verification required');
    });

    it('should allow login with valid token-based captcha', async () => {
      const validToken = 'test-token-123';
      mockCaptcha.setValidToken(validToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaToken: validToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return 400 if token-based captcha is invalid', async () => {
      mockCaptcha.setValidToken('correct-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaToken: 'wrong-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid CAPTCHA');
    });

    it('should allow login with valid session-based captcha', async () => {
      const captchaRes = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaSessionId: captchaRes.body.sessionId,
          captchaText: '123456' // mockCaptcha always uses this value
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return 400 if session-based captcha is invalid', async () => {
      const captchaRes = await request(app)
        .get('/api/auth/captcha');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaSessionId: captchaRes.body.sessionId,
          captchaText: 'wrongcaptcha'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid CAPTCHA');
    });

    it('should not allow reuse of session-based captcha', async () => {
      const captchaRes = await request(app)
        .get('/api/auth/captcha');

      // First attempt
      const firstRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaSessionId: captchaRes.body.sessionId,
          captchaText: '123456'
        });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body).toHaveProperty('token');

      // Second attempt with same captcha
      const secondRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaSessionId: captchaRes.body.sessionId,
          captchaText: '123456'
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toBe('Invalid CAPTCHA');
    });

    it('should fail with expired captcha session', async () => {
      const captchaRes = await request(app)
        .get('/api/auth/captcha');

      // Wait for captcha to expire (5 seconds in test mode)
      await new Promise(resolve => setTimeout(resolve, 5100));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password#12345!',
          captchaSessionId: captchaRes.body.sessionId,
          captchaText: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid CAPTCHA');
    });

    it('should pass wrong credentials error with valid captcha', async () => {
      const validToken = 'test-token-123';
      mockCaptcha.setValidToken(validToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
          captchaToken: validToken
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
