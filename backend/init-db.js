const mongoose = require('mongoose');
const Role = require('./models/Role');
const Privilege = require('./models/Privilege');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initializeDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Define initial privileges
    const privileges = [
      {
        name: 'Create User',
        code: 'create_user',
        description: 'Can create new users'
      },
      {
        name: 'Read User',
        code: 'read_user',
        description: 'Can view user details'
      },
      {
        name: 'Update User',
        code: 'update_user',
        description: 'Can update user details'
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
        description: 'Can create blog posts'
      },
      {
        name: 'Read Post',
        code: 'read_post',
        description: 'Can view blog posts'
      },
      {
        name: 'Update Post',
        code: 'update_post',
        description: 'Can update blog posts'
      },
      {
        name: 'Delete Post',
        code: 'delete_post',
        description: 'Can delete blog posts'
      },
      {
        name: 'Manage Tags',
        code: 'manage_tags',
        description: 'Can add, edit, and delete post tags'
      }
    ];

    // Create privileges
    const createdPrivileges = await Promise.all(
      privileges.map(async (priv) => {
        const existingPriv = await Privilege.findOne({ code: priv.code });
        if (!existingPriv) {
          return await Privilege.create(priv);
        }
        return existingPriv;
      })
    );

    // Create roles
    const superadminRole = await Role.findOne({ name: 'superadmin' });
    if (!superadminRole) {
      await Role.create({
        name: 'superadmin',
        description: 'Super Administrator with full access',
        privileges: createdPrivileges.map(p => p._id)
      });
    }

    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      await Role.create({
        name: 'admin',
        description: 'Administrator with post management access',
        privileges: createdPrivileges
          .filter(p => p.code.includes('post'))
          .map(p => p._id)
      });
    }

    // Create initial superadmin user if not exists
    let adminUser = await User.findOne({ username: 'admin_myblog' });
    if (!adminUser) {
      adminUser = new User({
        username: 'admin_myblog',
        email: 'admin@myblog.com',
        password: 'MyBl0g@dm1n2025!', // Will be hashed by pre-save middleware
        role: (await Role.findOne({ name: 'superadmin' }))._id
      });
      
      await adminUser.save();
      
      console.log('Admin user created with credentials:');
      console.log('Username: admin_myblog');
      console.log('Password: MyBl0g@dm1n2025!');
    }

    // Create sample blog posts
    const Post = require('./models/Post');
    const samplePosts = [
      {
        title: 'Welcome to My Blog',
        content: '<h2>Welcome to My New Blog!</h2><p>This is the beginning of our journey together. Here, we\'ll explore various topics and share interesting insights.</p><p>Stay tuned for more content!</p>',
        excerpt: 'Welcome to our new blog platform. Join us on this exciting journey of discovery and learning.',
        author: adminUser._id,
        isPublished: true,
        tags: ['welcome', 'introduction']
      },
      {
        title: 'The Art of Writing',
        content: '<h2>The Art of Writing</h2><p>Writing is more than just putting words on paper. It\'s about expressing ideas, sharing emotions, and connecting with readers.</p><h3>Key Elements of Good Writing</h3><ul><li>Clarity</li><li>Coherence</li><li>Engagement</li></ul>',
        excerpt: 'Discover the essential elements that make writing powerful and engaging.',
        author: adminUser._id,
        isPublished: true,
        tags: ['writing', 'tips', 'creativity']
      },
      {
        title: 'Technology in 2025',
        content: '<h2>Technology Trends in 2025</h2><p>As we move through 2025, several technology trends are shaping our future:</p><ul><li>Artificial Intelligence Advancement</li><li>Sustainable Tech Solutions</li><li>Digital Privacy Innovation</li></ul><p>Let\'s explore how these trends are impacting our daily lives.</p>',
        excerpt: 'Exploring the latest technology trends and their impact on our future.',
        author: adminUser._id,
        isPublished: true,
        tags: ['technology', 'trends', '2025']
      }
    ];

    for (const postData of samplePosts) {
      const existingPost = await Post.findOne({ title: postData.title });
      if (!existingPost) {
        await Post.create(postData);
        console.log(`Created sample post: ${postData.title}`);
      }
    }

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDB();