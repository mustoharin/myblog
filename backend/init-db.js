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
    const superadminUser = await User.findOne({ username: 'superadmin' });
    if (!superadminUser) {
      const newUser = new User({
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: 'superadmin123', // Will be hashed by pre-save middleware
        role: (await Role.findOne({ name: 'superadmin' }))._id
      });
      
      await newUser.save();
      
      console.log('Superadmin user created with credentials:');
      console.log('Username: superadmin');
      console.log('Password: superadmin123');
    }

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDB();