/**
 * Media Validation Utilities
 * Phase 3: Advanced Media Management
 * 
 * Provides functions for validating media references in posts,
 * detecting broken links, and ensuring content integrity.
 */

const Media = require('../models/Media');
const Post = require('../models/Post');
const { extractMediaFromContent } = require('./mediaExtractor');

/**
 * Validate all media references in a post's content
 * @param {string} content - Post content (HTML)
 * @returns {Promise<Object>} Validation results
 */
async function validatePostContent(content) {
  const mediaUrls = extractMediaFromContent(content);
  const results = {
    totalReferences: mediaUrls.length,
    valid: [],
    invalid: [],
    deleted: [],
    orphaned: [],
  };

  if (mediaUrls.length === 0) {
    return results;
  }

  // Find all media files referenced in content
  const mediaFiles = await Media.find({
    url: { $in: mediaUrls },
  });

  const foundUrls = new Set(mediaFiles.map(m => m.url));

  // Categorize each reference
  for (const url of mediaUrls) {
    const media = mediaFiles.find(m => m.url === url);
    
    if (!media) {
      results.invalid.push({ url, reason: 'Media not found in database' });
    } else if (media.deletedAt) {
      results.deleted.push({ 
        url, 
        filename: media.filename,
        deletedAt: media.deletedAt,
      });
    } else if (media.isOrphaned()) {
      results.orphaned.push({
        url,
        filename: media.filename,
        orphanedSince: media.orphanedSince,
      });
    } else {
      results.valid.push({
        url,
        filename: media.filename,
        usageCount: media.usageCount,
      });
    }
  }

  results.isValid = results.invalid.length === 0 && results.deleted.length === 0;

  return results;
}

/**
 * Find all broken media references in a post
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Broken references report
 */
async function findBrokenReferences(postId) {
  const post = await Post.findById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  const validation = await validatePostContent(post.content);
  const featuredImageIssue = null;

  // Check featured image if exists
  if (post.featuredImage) {
    const featuredMedia = await Media.findById(post.featuredImage);
    
    if (!featuredMedia) {
      featuredImageIssue = { reason: 'Featured image not found' };
    } else if (featuredMedia.deletedAt) {
      featuredImageIssue = { 
        reason: 'Featured image deleted',
        deletedAt: featuredMedia.deletedAt,
      };
    }
  }

  return {
    postId: post._id,
    postTitle: post.title,
    featuredImage: post.featuredImage ? {
      id: post.featuredImage,
      issue: featuredImageIssue,
    } : null,
    contentValidation: validation,
    hasBrokenReferences: !validation.isValid || featuredImageIssue !== null,
  };
}

/**
 * Find all posts with broken media references
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts with issues
 */
async function findPostsWithBrokenReferences(options = {}) {
  const { limit = 100, skip = 0 } = options;
  
  const posts = await Post.find({ status: 'published' })
    .select('_id title content featuredImage')
    .limit(limit)
    .skip(skip);

  const postsWithIssues = [];

  for (const post of posts) {
    const report = await findBrokenReferences(post._id);
    
    if (report.hasBrokenReferences) {
      postsWithIssues.push(report);
    }
  }

  return postsWithIssues;
}

/**
 * Check overall media health in the system
 * @returns {Promise<Object>} System-wide health report
 */
async function checkMediaHealth() {
  const [
    totalMedia,
    deletedMedia,
    orphanedMedia,
    totalPosts,
    publishedPosts,
  ] = await Promise.all([
    Media.countDocuments({ deletedAt: null }),
    Media.countDocuments({ deletedAt: { $ne: null } }),
    Media.findOrphaned(0), // All orphaned media
    Post.countDocuments(),
    Post.countDocuments({ status: 'published' }),
  ]);

  // Sample check for broken references in published posts
  const sampleSize = Math.min(publishedPosts, 50);
  const posts = await Post.find({ status: 'published' })
    .select('_id title content featuredImage')
    .limit(sampleSize);

  let postsWithIssues = 0;
  let totalBrokenReferences = 0;

  for (const post of posts) {
    const report = await findBrokenReferences(post._id);
    if (report.hasBrokenReferences) {
      postsWithIssues++;
      totalBrokenReferences += 
        report.contentValidation.invalid.length + 
        report.contentValidation.deleted.length +
        (report.featuredImage?.issue ? 1 : 0);
    }
  }

  const estimatedBrokenPosts = publishedPosts > sampleSize
    ? Math.round((postsWithIssues / sampleSize) * publishedPosts)
    : postsWithIssues;

  return {
    media: {
      total: totalMedia,
      deleted: deletedMedia,
      orphaned: orphanedMedia.length,
      active: totalMedia - orphanedMedia.length,
    },
    posts: {
      total: totalPosts,
      published: publishedPosts,
      sampleChecked: sampleSize,
      postsWithIssues,
      estimatedBrokenPosts,
      totalBrokenReferences,
    },
    healthScore: calculateHealthScore(
      totalMedia,
      orphanedMedia.length,
      postsWithIssues,
      sampleSize
    ),
    checkedAt: new Date(),
  };
}

/**
 * Calculate system health score (0-100)
 * @private
 */
function calculateHealthScore(totalMedia, orphanedCount, brokenPosts, sampleSize) {
  if (totalMedia === 0) return 100;
  
  const orphanedRate = orphanedCount / totalMedia;
  const brokenRate = sampleSize > 0 ? brokenPosts / sampleSize : 0;
  
  // Weight: 60% orphaned rate, 40% broken references rate
  const score = 100 - (orphanedRate * 60 + brokenRate * 40);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Suggest replacement media for deleted/broken references
 * @param {string} brokenUrl - URL of broken media
 * @returns {Promise<Array>} Suggested replacements
 */
async function suggestReplacements(brokenUrl) {
  // Extract filename and extension
  const urlParts = brokenUrl.split('/').pop();
  const [filename] = urlParts.split('.');
  const cleanName = filename.replace(/[^a-zA-Z0-9]/g, ' ').trim();

  if (!cleanName) {
    return [];
  }

  // Find similar media by filename
  const suggestions = await Media.find({
    deletedAt: null,
    $or: [
      { originalName: new RegExp(cleanName, 'i') },
      { filename: new RegExp(cleanName, 'i') },
    ],
  })
    .limit(5)
    .populate('uploadedBy', 'username fullName')
    .select('filename originalName url mimeType size usageCount createdAt');

  return suggestions;
}

/**
 * Validate media before permanent deletion
 * @param {string} mediaId - Media ID
 * @returns {Promise<Object>} Deletion safety report
 */
async function validateDeletion(mediaId) {
  const media = await Media.findById(mediaId);
  
  if (!media) {
    throw new Error('Media not found');
  }

  const usedInPosts = await Post.find({
    $or: [
      { featuredImage: mediaId },
      { 'contentMedia.mediaId': mediaId },
    ],
  }).select('_id title status');

  const publishedPosts = usedInPosts.filter(p => p.status === 'published');
  const draftPosts = usedInPosts.filter(p => p.status === 'draft');

  return {
    media: {
      id: media._id,
      filename: media.filename,
      url: media.url,
      usageCount: media.usageCount,
      isOrphaned: media.isOrphaned(),
    },
    usage: {
      totalPosts: usedInPosts.length,
      publishedPosts: publishedPosts.length,
      draftPosts: draftPosts.length,
      posts: usedInPosts.map(p => ({
        id: p._id,
        title: p.title,
        status: p.status,
      })),
    },
    safeToDelete: usedInPosts.length === 0,
    warnings: generateDeletionWarnings(media, usedInPosts, publishedPosts),
  };
}

/**
 * Generate warnings for media deletion
 * @private
 */
function generateDeletionWarnings(media, usedInPosts, publishedPosts) {
  const warnings = [];

  if (publishedPosts.length > 0) {
    warnings.push({
      level: 'critical',
      message: `Media is used in ${publishedPosts.length} published post(s). Deletion will break live content.`,
    });
  }

  if (usedInPosts.length > 0 && publishedPosts.length === 0) {
    warnings.push({
      level: 'warning',
      message: `Media is used in ${usedInPosts.length} draft post(s).`,
    });
  }

  if (media.usageCount > 0 && usedInPosts.length === 0) {
    warnings.push({
      level: 'info',
      message: 'Usage count suggests media was previously used but is no longer referenced.',
    });
  }

  return warnings;
}

module.exports = {
  validatePostContent,
  findBrokenReferences,
  findPostsWithBrokenReferences,
  checkMediaHealth,
  suggestReplacements,
  validateDeletion,
};
