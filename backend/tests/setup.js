const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const User = require('../models/User');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Load environment variables for test
  require('dotenv').config();

  // Set up test environment variables
  process.env.TEST_BYPASS_CAPTCHA_TOKEN = 'e2e_test_bypass_captcha_2025';
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Set up default valid token for testing
  require('../utils/mockCaptcha').setValidToken('valid-token');
});

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up database between tests
afterEach(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await Privilege.deleteMany({});
  
  // Reset CAPTCHA state
  const mockCaptcha = require('../utils/mockCaptcha');
  mockCaptcha.sessions.clear();
  mockCaptcha.usedSessions.clear();
  mockCaptcha.setValidToken('valid-token');
});

// Helper function to create initial privileges
async function createInitialPrivileges() {
  const privileges = [
    {
      name: 'Change Password',
      code: 'change_password',
      description: 'Can change own password'
    },
    {
      name: 'Create User',
      code: 'create_user',
      description: 'Can create new users'
    },
    {
      name: 'Read User',
      code: 'read_user',
      description: 'Can read user information'
    },
    {
      name: 'Update User',
      code: 'update_user',
      description: 'Can update user information'
    },
    {
      name: 'Delete User',
      code: 'delete_user',
      description: 'Can delete users'
    },
    {
      name: 'Manage Roles',
      code: 'manage_roles',
      description: 'Can manage roles and privileges'
    },
    {
      name: 'Create Post',
      code: 'create_post',
      description: 'Can create posts'
    },
    {
      name: 'Read Post',
      code: 'read_post',
      description: 'Can read posts'
    },
    {
      name: 'Update Post',
      code: 'update_post',
      description: 'Can update posts'
    },
    {
      name: 'Delete Post',
      code: 'delete_post',
      description: 'Can delete posts'
    }
  ];

  return await Privilege.insertMany(privileges);
}

// Helper function to create initial roles
async function createInitialRoles(privileges) {
  const superadminRole = await Role.create({
    name: 'superadmin',
    description: 'Super Administrator',
    privileges: privileges.map(p => p._id)
  });

  const adminRole = await Role.create({
    name: 'admin',
    description: 'Administrator',
    privileges: privileges.filter(p => p.code.includes('post')).map(p => p._id)
  });

  const regularRole = await Role.create({
    name: 'regular',
    description: 'Regular User',
    privileges: privileges.filter(p => ['read_post', 'update_user', 'change_password'].includes(p.code)).map(p => p._id)
  });

  return { superadminRole, adminRole, regularRole };
}

// Helper function to create a test user
async function createTestUser(username, roleId) {
  const user = new User({
    username,
    email: `${username}@test.com`,
    password: 'Password#12345!',
    role: roleId
  });

  return await user.save();
}

// Helper function to get auth token
  // Helper function to get auth token
async function getAuthToken(app, username, password) {
  try {
    // Get CAPTCHA session first
    const captchaResponse = await require('supertest')(app)
      .get('/api/auth/captcha');

    if (!captchaResponse.body.sessionId) {
      throw new Error('Failed to get CAPTCHA session');
    }

    // Login with session-based CAPTCHA
    const response = await require('supertest')(app)
      .post('/api/auth/login')
      .send({
        username,
        password,
        captchaText: '123456',
        captchaSessionId: captchaResponse.body.sessionId
      });

    if (response.status === 200 && response.body.token) {
      return response.body.token;
    }

    throw new Error(`Failed to get auth token: ${response.status} ${JSON.stringify(response.body)}`);
  } catch (error) {
    throw error;
  }
}

// Helper function to create a test post
async function createTestPost(authorId, title = 'Test Post', content = 'Test content') {
  const Post = require('../models/Post');
  return await Post.create({
    title,
    content,
    author: authorId
  });
}

// Helper function to create multiple test posts
async function createTestPosts(authorId, count = 5) {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      title: `Test Post ${i + 1}`,
      content: `Test content for post ${i + 1}`,
      author: authorId
    });
  }
  const Post = require('../models/Post');
  return await Post.insertMany(posts);
}

// Helper to verify user has required privileges
function hasRequiredPrivileges(user, requiredPrivileges) {
  const userPrivilegeCodes = user.role.privileges.map(p => p.code);
  return requiredPrivileges.every(privilege => userPrivilegeCodes.includes(privilege));
}

// Helper function to get auth token for superadmin
async function getSuperadminToken(app) {
  return getAuthToken(app, 'superadmin', 'Password#12345!');
}

// Helper function to get auth token for admin
async function getAdminToken(app) {
  return getAuthToken(app, 'admin', 'Password#12345!');
}

module.exports = {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getAuthToken,
  getSuperadminToken,
  getAdminToken,
  createTestPost,
  createTestPosts,
  hasRequiredPrivileges
};