const mongoose = require('mongoose');
const { validateNoXss } = require('../utils/xssValidator');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Tag name must contain only lowercase letters, numbers, and hyphens'],
    minlength: [1, 'Tag name cannot be empty'],
    maxlength: [50, 'Tag name cannot exceed 50 characters'],
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters'],
    validate: {
      validator(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Display name contains potentially unsafe content',
    },
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    validate: {
      validator(v) {
        if (!v) return true; // Description is optional
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Description contains potentially unsafe content',
    },
  },
  color: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'],
    default: '#1976d2', // Material-UI primary blue
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  postCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

// Pre-query middleware to exclude deleted documents
TagSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function() {
  this.where({ deletedAt: null });
});

// Soft delete method
TagSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Restore method
TagSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find deleted documents
TagSchema.statics.findDeleted = function() {
  return this.find({ deletedAt: { $ne: null } });
};

// Static method to find all documents including deleted
TagSchema.statics.findWithDeleted = function() {
  return this.findWithDeleted;
};

// Middleware to automatically update updatedAt on save
TagSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware to automatically update updatedAt on findOneAndUpdate
TagSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Index for efficient querying
TagSchema.index({ name: 1 });
TagSchema.index({ isActive: 1 });
TagSchema.index({ postCount: -1 });

module.exports = mongoose.model('Tag', TagSchema);