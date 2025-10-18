const mongoose = require('mongoose');
const { validateRichContent } = require('../utils/richContentValidator');

const PrivilegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const result = validateRichContent(v);
        if (result.error) {
          return false;
        }
        // Update the description with sanitized version
        this.description = result.clean;
        return true;
      },
      message: _props => 'Description validation failed: Invalid or unsafe HTML content'
    }
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'user_management',
      'role_management', 
      'content_management',
      'comment_management',
      'system_administration',
      'authentication'
    ]
  },
  moduleDisplayName: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

// Pre-query middleware to exclude deleted documents
PrivilegeSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function() {
  this.where({ deletedAt: null });
});

// Soft delete method
PrivilegeSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Restore method
PrivilegeSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to get privileges grouped by module
PrivilegeSchema.statics.getGroupedByModule = function() {
  return this.aggregate([
    { $match: { deletedAt: null, isActive: true } },
    { $sort: { module: 1, priority: -1, name: 1 } },
    {
      $group: {
        _id: '$module',
        moduleDisplayName: { $first: '$moduleDisplayName' },
        privileges: {
          $push: {
            _id: '$_id',
            name: '$name',
            description: '$description',
            code: '$code',
            priority: '$priority'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        module: '$_id',
        moduleDisplayName: 1,
        privileges: 1,
        count: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to get module list
PrivilegeSchema.statics.getModules = function() {
  return [
    { code: 'authentication', name: 'Authentication & Security', description: 'Login, password, and security related privileges' },
    { code: 'user_management', name: 'User Management', description: 'Create, read, update, and delete user accounts' },
    { code: 'role_management', name: 'Role & Privilege Management', description: 'Manage roles and assign privileges' },
    { code: 'content_management', name: 'Content Management', description: 'Manage blog posts, tags, and content' },
    { code: 'comment_management', name: 'Comment Management', description: 'Moderate and manage user comments' },
    { code: 'system_administration', name: 'System Administration', description: 'System settings, monitoring, and administration' }
  ];
};

// Static method to find deleted documents
PrivilegeSchema.statics.findDeleted = function() {
  return this.find({ deletedAt: { $ne: null } });
};

// Static method to find all documents including deleted
PrivilegeSchema.statics.findWithDeleted = function() {
  return this.findWithDeleted;
};

// Middleware to automatically update updatedAt on save
PrivilegeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware to automatically update updatedAt on findOneAndUpdate
PrivilegeSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Privilege', PrivilegeSchema);