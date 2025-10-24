/**
 * Media Extractor Utility
 * Extracts media references from HTML content and converts them to Media model IDs
 */

const Media = require('../models/Media');

/**
 * Extract all image URLs from HTML content
 * @param {string} htmlContent - HTML content string
 * @returns {string[]} - Array of image URLs
 */
const extractImageUrls = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  const urls = [];
  
  // Match img tags with src attribute
  // Supports single quotes, double quotes, and unquoted src values
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const url = match[1];
    if (url && url.trim()) {
      urls.push(url.trim());
    }
  }

  return urls;
};

/**
 * Filter URLs to only include local/MinIO media URLs
 * @param {string[]} urls - Array of all image URLs
 * @param {string} baseUrl - Base URL for MinIO (e.g., 'http://localhost:9000')
 * @returns {string[]} - Array of local media URLs only
 */
const filterLocalMediaUrls = (urls, baseUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000') => {
  if (!urls || !Array.isArray(urls)) {
    return [];
  }

  const bucketName = process.env.MINIO_BUCKET || 'blog-media';
  
  return urls.filter((url) => {
    // Check if URL contains our MinIO base URL and bucket name
    return url.includes(baseUrl) && url.includes(bucketName);
  });
};

/**
 * Convert media URLs to Media model IDs
 * @param {string[]} urls - Array of media URLs
 * @returns {Promise<string[]>} - Array of Media document IDs
 */
const getMediaIdsFromUrls = async (urls) => {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  try {
    // Find all media documents matching the URLs
    const mediaDocuments = await Media.find({
      url: { $in: urls },
      deletedAt: null,
    }).select('_id url');

    // Return array of IDs
    return mediaDocuments.map((doc) => doc._id.toString());
  } catch (error) {
    console.error('Error getting media IDs from URLs:', error);
    return [];
  }
};

/**
 * Extract media IDs from HTML content (complete pipeline)
 * @param {string} htmlContent - HTML content string
 * @returns {Promise<string[]>} - Array of Media document IDs
 */
const extractMediaIdsFromContent = async (htmlContent) => {
  if (!htmlContent) {
    return [];
  }

  try {
    // 1. Extract all image URLs from HTML
    const allUrls = extractImageUrls(htmlContent);
    
    // 2. Filter to only local media URLs
    const localUrls = filterLocalMediaUrls(allUrls);
    
    // 3. Convert URLs to Media IDs
    const mediaIds = await getMediaIdsFromUrls(localUrls);
    
    return mediaIds;
  } catch (error) {
    console.error('Error extracting media IDs from content:', error);
    return [];
  }
};

/**
 * Track media usage changes when content is updated
 * @param {string} oldContent - Previous HTML content
 * @param {string} newContent - New HTML content
 * @param {string} postId - Post document ID
 * @returns {Promise<{added: number, removed: number}>} - Tracking statistics
 */
const trackContentMediaChanges = async (oldContent, newContent, postId) => {
  try {
    // Extract media from both old and new content
    const oldMediaIds = await extractMediaIdsFromContent(oldContent || '');
    const newMediaIds = await extractMediaIdsFromContent(newContent || '');

    // Find media to remove (in old but not in new)
    const toRemove = oldMediaIds.filter((id) => !newMediaIds.includes(id));
    
    // Find media to add (in new but not in old)
    const toAdd = newMediaIds.filter((id) => !oldMediaIds.includes(id));

    // Remove old media usage
    for (const mediaId of toRemove) {
      const media = await Media.findById(mediaId);
      if (media) {
        await media.removeUsage('Post', postId);
      }
    }

    // Add new media usage
    for (const mediaId of toAdd) {
      const media = await Media.findById(mediaId);
      if (media) {
        await media.addUsage('Post', postId);
      }
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
    };
  } catch (error) {
    console.error('Error tracking content media changes:', error);
    return { added: 0, removed: 0 };
  }
};

/**
 * Add media usage tracking for all images in content
 * @param {string} htmlContent - HTML content
 * @param {string} postId - Post document ID
 * @returns {Promise<number>} - Number of media items tracked
 */
const addContentMediaTracking = async (htmlContent, postId) => {
  try {
    const mediaIds = await extractMediaIdsFromContent(htmlContent);
    
    let trackedCount = 0;
    for (const mediaId of mediaIds) {
      const media = await Media.findById(mediaId);
      if (media) {
        await media.addUsage('Post', postId);
        trackedCount++;
      }
    }

    return trackedCount;
  } catch (error) {
    console.error('Error adding content media tracking:', error);
    return 0;
  }
};

/**
 * Remove media usage tracking for all images in content
 * @param {string} htmlContent - HTML content
 * @param {string} postId - Post document ID
 * @returns {Promise<number>} - Number of media items untracked
 */
const removeContentMediaTracking = async (htmlContent, postId) => {
  try {
    const mediaIds = await extractMediaIdsFromContent(htmlContent);
    
    let untrackedCount = 0;
    for (const mediaId of mediaIds) {
      const media = await Media.findById(mediaId);
      if (media) {
        await media.removeUsage('Post', postId);
        untrackedCount++;
      }
    }

    return untrackedCount;
  } catch (error) {
    console.error('Error removing content media tracking:', error);
    return 0;
  }
};

module.exports = {
  extractImageUrls,
  filterLocalMediaUrls,
  getMediaIdsFromUrls,
  extractMediaIdsFromContent,
  trackContentMediaChanges,
  addContentMediaTracking,
  removeContentMediaTracking,
};
