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
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9-]+$/.test(v);
      },
      message: props => `${props.value} is not a valid tag format. Use only letters, numbers, and hyphens.`
    }
  }],
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
  comments: [CommentSchema],
  tags: {
    type: [String]
  }
});

// Add text search indexes
PostSchema.index({ title: 'text', content: 'text' });
// Add tag index for efficient tag filtering
PostSchema.index({ tags: 1 });

module.exports = mongoose.model('Post', PostSchema);