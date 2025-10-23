// Set test environment first before any imports
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const Role = require('../models/Role');
const Privilege = require('../models/Privilege');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

// Setup before all tests
beforeAll(async () => {
  // Load environment variables for test
  require('dotenv').config();

  // Set up test environment variables
  process.env.TEST_BYPASS_CAPTCHA_TOKEN = 'e2e_test_bypass_captcha_2025';
  
  // Disconnect any existing connection first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Use the existing MongoDB container for testing with authentication
  // Use localhost for running tests outside Docker, myblog-mongodb for inside Docker
  const isInDocker = process.env.DOCKER_ENV === 'true';
  const mongoHost = isInDocker ? 'myblog-mongodb' : 'localhost';
  const mongoPort = isInDocker ? '27017' : '27018';
  const mongoUri = `mongodb://admin:password123@${mongoHost}:${mongoPort}/myblog_test?authSource=admin`;
  await mongoose.connect(mongoUri);
  
  // Set up default valid token for testing
  require('../utils/mockCaptcha').setValidToken('valid-token');
});

// Clean up after all tests
afterAll(async () => {
  // Clean up test database
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
});

// Clean up database between tests
afterEach(async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
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
      description: 'Can change own password',
      module: 'authentication',
      moduleDisplayName: 'Authentication',
    },
    {
      name: 'Create User',
      code: 'create_user',
      description: 'Can create new users',
      module: 'user_management',
      moduleDisplayName: 'User Management',
    },
    {
      name: 'Read User',
      code: 'read_user',
      description: 'Can read user information',
      module: 'user_management',
      moduleDisplayName: 'User Management',
    },
    {
      name: 'Update User',
      code: 'update_user',
      description: 'Can update user information',
      module: 'user_management',
      moduleDisplayName: 'User Management',
    },
    {
      name: 'Delete User',
      code: 'delete_user',
      description: 'Can delete users',
      module: 'user_management',
      moduleDisplayName: 'User Management',
    },
    {
      name: 'Manage User Roles',
      code: 'manage_user_roles',
      description: 'Can assign and modify user roles',
      module: 'user_management',
      moduleDisplayName: 'User Management',
    },
    {
      name: 'Manage Roles',
      code: 'manage_roles',
      description: 'Can manage roles and privileges',
      module: 'role_management',
      moduleDisplayName: 'Role Management',
    },
    {
      name: 'Create Post',
      code: 'create_post',
      description: 'Can create posts',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Read Post',
      code: 'read_post',
      description: 'Can read posts',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Update Post',
      code: 'update_post',
      description: 'Can update posts',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Delete Post',
      code: 'delete_post',
      description: 'Can delete posts',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Publish Post',
      code: 'publish_post',
      description: 'Can publish and unpublish posts',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Manage Tags',
      code: 'manage_tags',
      description: 'Can create, edit, and delete tags',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Manage Comments',
      code: 'manage_comments',
      description: 'Can moderate comments',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'Reply Comments',
      code: 'reply_comments',
      description: 'Can reply to comments',
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    },
    {
      name: 'View Activities',
      code: 'view_activities',
      description: 'Can view system activity logs',
      module: 'system_administration',
      moduleDisplayName: 'System Administration',
    },
    {
      name: 'View Analytics',
      code: 'view_analytics',
      description: 'Can access analytics and reports',
      module: 'system_administration',
      moduleDisplayName: 'System Administration',
    },
  ];

  return await Privilege.insertMany(privileges);
}

// Helper function to create initial roles
async function createInitialRoles(privileges) {
  const superadminRole = await Role.create({
    name: 'superadmin',
    description: 'Super Administrator',
    privileges: privileges.map(p => p._id),
  });

  const adminRole = await Role.create({
    name: 'admin',
    description: 'Administrator',
    privileges: privileges.filter(p => 
      p.code.includes('post') || 
      p.code.includes('comment') || 
      p.code === 'manage_tags' ||
      p.code === 'manage_media' ||
      p.code === 'view_activities' ||
      p.code === 'view_analytics'
    ).map(p => p._id),
  });

  const regularRole = await Role.create({
    name: 'regular',
    description: 'Regular User',
    privileges: privileges.filter(p => ['read_post', 'update_user', 'change_password'].includes(p.code)).map(p => p._id),
  });

  return { superadminRole, adminRole, regularRole };
}

// Helper function to create a test user
async function createTestUser(username, roleId) {
  const user = new User({
    username,
    email: `${username}@test.com`,
    password: 'Password#12345!',
    role: roleId,
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
        captchaSessionId: captchaResponse.body.sessionId,
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
    author: authorId,
  });
}

// Helper function to create multiple test posts
async function createTestPosts(authorId, count = 5) {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      title: `Test Post ${i + 1}`,
      content: `Test content for post ${i + 1}`,
      author: authorId,
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
  hasRequiredPrivileges,
};