const mongoose = require('mongoose');
const { validateNoXss } = require('../utils/xssValidator');
const { validateRichContent } = require('../utils/richContentValidator');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Role name contains potentially unsafe content'
    }
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
      message: props => 'Description validation failed: Invalid or unsafe HTML content'
    }
  },
  privileges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Privilege'
  }],
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
RoleSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function() {
  this.where({ deletedAt: null });
});

// Soft delete method
RoleSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Restore method
RoleSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find deleted documents
RoleSchema.statics.findDeleted = function() {
  return this.find({ deletedAt: { $ne: null } });
};

// Static method to find all documents including deleted
RoleSchema.statics.findWithDeleted = function() {
  return this.findWithDeleted;
};

// Middleware to automatically update updatedAt on save
RoleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware to automatically update updatedAt on findOneAndUpdate
RoleSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Role', RoleSchema);