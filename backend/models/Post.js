const mongoose = require('mongoose');
const { validateNoXss } = require('../utils/xssValidator');
const { validateRichContent } = require('../utils/richContentValidator');

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Content contains potentially unsafe content'
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: {
    type: String,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Name contains potentially unsafe content'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PostSchema = new mongoose.Schema({
  isPublished: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    validate: [{
      validator: function(v) {
        return v.every(tag => /^[a-z0-9-]+$/.test(tag));
      },
      message: _props => 'Tags must contain only lowercase letters, numbers, and hyphens'
    }],
    default: []
  },
  excerpt: {
    type: String,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Excerpt contains potentially unsafe content'
    }
  },
  title: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Title contains potentially unsafe content'
    }
  },
  content: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const result = validateRichContent(v);
        if (result.error) {
          return false;
        }
        // Update the content with sanitized version
        this.content = result.clean;
        return true;
      },
      message: _props => 'Content validation failed: Invalid or unsafe HTML content'
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
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
  },
  comments: [CommentSchema]
});

// Middleware to automatically update updatedAt on save
PostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware to automatically update updatedAt on findOneAndUpdate
PostSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Soft delete middleware - exclude deleted documents by default
PostSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function() {
  this.where({ deletedAt: null });
});

// Add soft delete method
PostSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Add restore method
PostSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find deleted documents
PostSchema.statics.findDeleted = function() {
  return this.find({ deletedAt: { $ne: null } });
};

// Static method to find with deleted documents
PostSchema.statics.findWithDeleted = function() {
  return this.find({});
};

// Add text search indexes
PostSchema.index({ title: 'text', content: 'text' });
// Add tag index for efficient tag filtering
PostSchema.index({ tags: 1 });
// Add views index for sorting by popularity
PostSchema.index({ views: -1 });
// Add shares index for sorting by popularity
PostSchema.index({ shares: -1 });

module.exports = mongoose.model('Post', PostSchema);