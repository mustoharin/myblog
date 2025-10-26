/**
 * Media Analytics Utilities
 * Phase 3: Advanced Media Management
 * 
 * Provides functions for analyzing media usage patterns, storage statistics,
 * and generating insights about media management.
 */

const Media = require('../models/Media');
const Post = require('../models/Post');

/**
 * Get comprehensive media usage statistics
 * @returns {Promise<Object>} Usage statistics
 */
async function getUsageStatistics() {
  const [total, used, unused, deleted] = await Promise.all([
    Media.countDocuments({ deletedAt: null }),
    Media.countDocuments({ deletedAt: null, 'usedIn.0': { $exists: true } }),
    Media.countDocuments({ deletedAt: null, usedIn: { $size: 0 } }),
    Media.countDocuments({ deletedAt: { $ne: null } }),
  ]);

  const usageRate = total > 0 ? ((used / total) * 100).toFixed(2) : 0;

  return {
    total,
    used,
    unused,
    deleted,
    usageRate: parseFloat(usageRate),
  };
}

/**
 * Get most used media files
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Most used media
 */
async function getMostUsedMedia(limit = 10) {
  return Media.find({ deletedAt: null })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username fullName')
    .select('filename originalName url usageCount lastUsedAt usedIn size mimeType');
}

/**
 * Get least used or unused media files
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Least used media
 */
async function getLeastUsedMedia(limit = 10) {
  return Media.find({ deletedAt: null })
    .sort({ usageCount: 1, createdAt: 1 })
    .limit(limit)
    .populate('uploadedBy', 'username fullName')
    .select('filename originalName url usageCount lastUsedAt createdAt size mimeType');
}

/**
 * Get storage statistics by usage
 * @returns {Promise<Object>} Storage breakdown
 */
async function getStorageByUsage() {
  const [usedMedia, unusedMedia] = await Promise.all([
    Media.find({ deletedAt: null, 'usedIn.0': { $exists: true } }),
    Media.find({ deletedAt: null, usedIn: { $size: 0 } }),
  ]);

  const usedSize = usedMedia.reduce((sum, media) => sum + media.size, 0);
  const unusedSize = unusedMedia.reduce((sum, media) => sum + media.size, 0);
  const totalSize = usedSize + unusedSize;

  return {
    used: {
      count: usedMedia.length,
      size: usedSize,
      sizeMB: (usedSize / (1024 * 1024)).toFixed(2),
      percentage: totalSize > 0 ? ((usedSize / totalSize) * 100).toFixed(2) : 0,
    },
    unused: {
      count: unusedMedia.length,
      size: unusedSize,
      sizeMB: (unusedSize / (1024 * 1024)).toFixed(2),
      percentage: totalSize > 0 ? ((unusedSize / totalSize) * 100).toFixed(2) : 0,
    },
    total: {
      size: totalSize,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    },
  };
}

/**
 * Get upload timeline statistics
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Timeline data
 */
async function getUploadTimeline(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const timeline = await Media.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        count: 1,
        sizeMB: {
          $divide: ['$totalSize', 1048576], // Convert to MB
        },
        _id: 0,
      },
    },
  ]);

  return timeline;
}

/**
 * Get media usage by type
 * @returns {Promise<Array>} Media breakdown by MIME type
 */
async function getMediaByType() {
  return Media.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: '$mimeType',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' },
      },
    },
    {
      $project: {
        mimeType: '$_id',
        count: 1,
        totalSizeMB: {
          $divide: ['$totalSize', 1048576],
        },
        avgSizeMB: {
          $divide: ['$avgSize', 1048576],
        },
        _id: 0,
      },
    },
    { $sort: { count: -1 } },
  ]);
}

/**
 * Get media usage by uploader
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Upload statistics by user
 */
async function getMediaByUploader(limit = 10) {
  const User = require('../models/User');
  
  const stats = await Media.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: '$uploadedBy',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        usedCount: {
          $sum: {
            $cond: [{ $gt: [{ $size: '$usedIn' }, 0] }, 1, 0],
          },
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  // Populate user details
  for (const stat of stats) {
    const user = await User.findById(stat._id).select('username fullName');
    stat.user = user ? { username: user.username, fullName: user.fullName } : null;
  }

  return stats.map(stat => ({
    user: stat.user,
    count: stat.count,
    usedCount: stat.usedCount,
    unusedCount: stat.count - stat.usedCount,
    totalSizeMB: (stat.totalSize / (1024 * 1024)).toFixed(2),
  }));
}

/**
 * Get comprehensive analytics dashboard data
 * @returns {Promise<Object>} Complete analytics data
 */
async function getAnalyticsDashboard() {
  const [
    usage,
    storage,
    mostUsed,
    timeline,
    byType,
    orphanedStats,
  ] = await Promise.all([
    getUsageStatistics(),
    getStorageByUsage(),
    getMostUsedMedia(5),
    getUploadTimeline(30),
    getMediaByType(),
    Media.getOrphanedStats(),
  ]);

  return {
    usage,
    storage,
    mostUsed,
    timeline,
    byType,
    orphaned: orphanedStats,
    generatedAt: new Date(),
  };
}

module.exports = {
  getUsageStatistics,
  getMostUsedMedia,
  getLeastUsedMedia,
  getStorageByUsage,
  getUploadTimeline,
  getMediaByType,
  getMediaByUploader,
  getAnalyticsDashboard,
};
