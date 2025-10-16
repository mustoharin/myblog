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
      message: props => 'Tags must contain only letters, numbers, and hyphens'
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
      message: props => 'Content validation failed: Invalid or unsafe HTML content'
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
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
  comments: [CommentSchema]
});

// Add text search indexes
PostSchema.index({ title: 'text', content: 'text' });
// Add tag index for efficient tag filtering
PostSchema.index({ tags: 1 });
// Add views index for sorting by popularity
PostSchema.index({ views: -1 });
// Add shares index for sorting by popularity
PostSchema.index({ shares: -1 });

module.exports = mongoose.model('Post', PostSchema);