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
      message: props => 'Description validation failed: Invalid or unsafe HTML content'
    }
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
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