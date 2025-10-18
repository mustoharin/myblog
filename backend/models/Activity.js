const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'post_create', 'post_update', 'post_delete',
      'user_create', 'user_update', 'user_delete',
      'tag_create', 'tag_update', 'tag_delete',
      'role_create', 'role_update', 'role_delete',
      'comment_create', 'comment_delete',
      'profile_update',
    ],
  },
  actor: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    fullName: String,
  },
  target: {
    type: String, // 'post', 'user', 'tag', 'role', 'comment'
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Flexible data structure for activity details
    default: {},
  },
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Index for efficient querying
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ 'actor.id': 1, createdAt: -1 });
activitySchema.index({ target: 1, targetId: 1 });

// Static method to log activity
activitySchema.statics.logActivity = async function(type, actor, target, targetId, data = {}, req = null) {
  try {
    const activityData = {
      type,
      actor: {
        id: actor?._id || actor?.id,
        username: actor?.username || 'System',
        fullName: actor?.fullName || actor?.username || 'System',
      },
      target,
      targetId,
      data,
    };

    // Add request metadata if available
    if (req) {
      activityData.ipAddress = req.ip || req.connection?.remoteAddress;
      activityData.userAgent = req.get('User-Agent');
    }

    return await this.create(activityData);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main operations
    return null;
  }
};

// Instance method to get formatted description
activitySchema.methods.getDescription = function() {
  const actor = this.actor?.fullName || this.actor?.username || 'System';
  
  switch (this.type) {
    case 'post_create':
      return `${actor} created post "${this.data.title}"`;
    case 'post_update':
      return `${actor} updated post "${this.data.title}"`;
    case 'post_delete':
      return `${actor} deleted post "${this.data.title}"`;
    
    case 'user_create':
      return `New user registered: ${this.data.fullName || this.data.username}`;
    case 'user_update':
      return `${actor} updated user ${this.data.username}`;
    case 'user_delete':
      return `${actor} deleted user ${this.data.username}`;
    
    case 'tag_create':
      return `${actor} created tag "${this.data.displayName || this.data.name}"`;
    case 'tag_update':
      return `${actor} updated tag "${this.data.displayName || this.data.name}"`;
    case 'tag_delete':
      return `${actor} deleted tag "${this.data.displayName || this.data.name}"`;
    
    case 'role_create':
      return `${actor} created role "${this.data.name}"`;
    case 'role_update':
      return `${actor} updated role "${this.data.name}"`;
    case 'role_delete':
      return `${actor} deleted role "${this.data.name}"`;
    
    case 'comment_create':
      return `${actor} commented on "${this.data.postTitle}"`;
    case 'comment_delete':
      return `${actor} deleted a comment on "${this.data.postTitle}"`;
    
    default:
      return 'Unknown activity';
  }
};

module.exports = mongoose.model('Activity', activitySchema);