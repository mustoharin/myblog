const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  
  // Author information for both visitors and registered users
  author: {
    // For registered users
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    
    // For anonymous visitors
    name: {
      type: String,
      required: function() {
        return !this.author.user;
      },
      maxlength: 100,
      trim: true
    },
    email: {
      type: String,
      required: function() {
        return !this.author.user;
      },
      maxlength: 100,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      required: false,
      maxlength: 200,
      trim: true
    }
  },
  
  // Post reference
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  
  // For nested replies
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: false
  },
  
  // Comment status for moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  
  // Admin/moderator who approved/rejected
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  moderatedAt: {
    type: Date,
    required: false
  },
  
  // For spam detection and moderation
  ipAddress: {
    type: String,
    required: false
  },
  
  userAgent: {
    type: String,
    required: false
  },
  
  // Reply count for performance
  replyCount: {
    type: Number,
    default: 0
  },
  
  // Nested replies array for easy querying
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, {
  timestamps: true
});

// Indexes for performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ status: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ 'author.email': 1 });

// Virtual for author display name
commentSchema.virtual('authorDisplayName').get(function() {
  if (this.author.user) {
    return this.author.user.fullName || this.author.user.username;
  }
  return this.author.name;
});

// Virtual for author email
commentSchema.virtual('authorEmail').get(function() {
  if (this.author.user) {
    return this.author.user.email;
  }
  return this.author.email;
});

// Method to check if user can reply to comments
commentSchema.statics.canUserReply = function(user) {
  if (!user) return false;
  
  // Check if user has admin role or specific comment reply privilege
  return user.role && (
    user.role.name === 'admin' || 
    user.role.name === 'superadmin' ||
    (user.role.privileges && user.role.privileges.some(p => p.name === 'reply_comments'))
  );
};

// Method to get comment tree
commentSchema.statics.getCommentTree = async function(postId, status = 'approved') {
  const comments = await this.find({
    post: postId,
    status: status,
    parentComment: null
  })
  .populate('author.user', 'username fullName')
  .populate({
    path: 'replies',
    match: { status: status },
    populate: {
      path: 'author.user',
      select: 'username fullName'
    }
  })
  .sort({ createdAt: -1 });
  
  return comments;
};

// Pre-save middleware to update parent comment's reply count
commentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentComment) {
    await this.constructor.findByIdAndUpdate(
      this.parentComment,
      { 
        $inc: { replyCount: 1 },
        $push: { replies: this._id }
      }
    );
  }
  next();
});

// Pre-remove middleware to update parent comment's reply count
commentSchema.pre('remove', async function(next) {
  if (this.parentComment) {
    await this.constructor.findByIdAndUpdate(
      this.parentComment,
      { 
        $inc: { replyCount: -1 },
        $pull: { replies: this._id }
      }
    );
  }
  next();
});

// Ensure virtual fields are serialized
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Comment', commentSchema);