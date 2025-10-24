const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  // File Information
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  
  // Storage Information
  bucket: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  
  // Metadata
  altText: {
    type: String,
    maxlength: 200,
    default: '',
  },
  caption: {
    type: String,
    maxlength: 500,
    default: '',
  },
  folder: {
    type: String,
    default: 'uncategorized',
    index: true,
  },
  
  // Image-specific metadata
  metadata: {
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    format: {
      type: String,
      default: null,
    },
    isOptimized: {
      type: Boolean,
      default: false,
    },
  },
  
  // Usage tracking
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  usedIn: [
    {
      model: {
        type: String,
        enum: ['Post', 'User', 'Comment'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },
  ],
  usageCount: {
    type: Number,
    default: 0,
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },
});

// Compound indexes
MediaSchema.index({ uploadedBy: 1, createdAt: -1 });
MediaSchema.index({ mimeType: 1, deletedAt: 1 });
MediaSchema.index({ folder: 1, deletedAt: 1 });

// Pre-save middleware to update timestamps
MediaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Soft delete method
MediaSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  return this.save();
};

// Restore method
MediaSchema.methods.restore = async function() {
  this.deletedAt = null;
  return this.save();
};

// Increment usage count
MediaSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return this.save();
};

// Add usage reference
MediaSchema.methods.addUsage = async function(model, id) {
  if (!this.usedIn.some(u => u.model === model && u.id.equals(id))) {
    this.usedIn.push({ model, id });
    this.usageCount = this.usedIn.length;
    return this.save();
  }
  return this;
};

// Remove usage reference
MediaSchema.methods.removeUsage = async function(model, id) {
  this.usedIn = this.usedIn.filter(u => !(u.model === model && u.id.equals(id)));
  this.usageCount = this.usedIn.length;
  return this.save();
};

// Static method to find non-deleted media
MediaSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, deletedAt: null });
};

// Static method to find deleted media
MediaSchema.statics.findDeleted = function(query = {}) {
  return this.find({ ...query, deletedAt: { $ne: null } });
};

// Static method to find all (including deleted)
MediaSchema.statics.findWithDeleted = function(query = {}) {
  return this.find(query);
};

// Static method to get storage statistics
MediaSchema.statics.getStorageStats = async function() {
  const stats = await this.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },
        totalFiles: { $sum: 1 },
        imageCount: {
          $sum: {
            $cond: [{ $regexMatch: { input: '$mimeType', regex: /^image\// } }, 1, 0],
          },
        },
        documentCount: {
          $sum: { $cond: [{ $eq: ['$mimeType', 'application/pdf'] }, 1, 0] },
        },
      },
    },
  ]);

  return stats[0] || {
    totalSize: 0,
    totalFiles: 0,
    imageCount: 0,
    documentCount: 0,
  };
};

// Static method to get folder statistics
MediaSchema.statics.getFolderStats = async function() {
  return this.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: '$folder',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model('Media', MediaSchema);
