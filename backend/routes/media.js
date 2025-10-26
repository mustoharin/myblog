const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Media = require('../models/Media');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');
const { upload, handleUploadError } = require('../middleware/upload');
const { uploadFile, deleteFile, bucketName } = require('../config/minio');
const {
  generateFilename,
  sanitizeFolderName,
  optimizeImage,
  createThumbnail,
  getFileCategory,
  formatFileSize,
} = require('../utils/mediaProcessor');
const {
  getUsageStatistics,
  getMostUsedMedia,
  getLeastUsedMedia,
  getStorageByUsage,
  getUploadTimeline,
  getMediaByType,
  getMediaByUploader,
  getAnalyticsDashboard,
} = require('../utils/mediaAnalytics');

/**
 * @route POST /api/media/upload
 * @desc Upload a media file (image or PDF)
 * @access Private (requires manage_media privilege)
 */
router.post(
  '/upload',
  auth,
  checkRole(['manage_media']),
  upload.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { folder = 'uncategorized', altText = '', caption = '' } = req.body;
      const file = req.file;
      const fileCategory = getFileCategory(file.mimetype);

      // Sanitize folder name
      const sanitizedFolder = sanitizeFolderName(folder);

      // Generate unique filename
      const filename = generateFilename(file.originalname);
      const key = `${sanitizedFolder}/${filename}`;

      let fileBuffer = file.buffer;
      let metadata = {};
      let thumbnailUrl = null;

      // Process images
      if (fileCategory === 'image') {
        console.log(`📸 Processing image: ${file.originalname}`);
        
        // Optimize image
        const optimized = await optimizeImage(file.buffer);
        fileBuffer = optimized.buffer;
        metadata = optimized.metadata;

        console.log(
          `✅ Image optimized: ${formatFileSize(metadata.originalSize)} → ${formatFileSize(metadata.optimizedSize)} (${metadata.compressionRatio}% reduction)`,
        );

        // Create thumbnail
        const thumbnailBuffer = await createThumbnail(file.buffer);
        const thumbnailKey = `${sanitizedFolder}/thumbnails/${filename}`;
        
        thumbnailUrl = await uploadFile(
          thumbnailKey,
          thumbnailBuffer,
          thumbnailBuffer.length,
          'image/jpeg',
        );

        console.log(`✅ Thumbnail created: ${thumbnailKey}`);
      }

      // Upload to MinIO
      const url = await uploadFile(
        key,
        fileBuffer,
        fileBuffer.length,
        file.mimetype,
      );

      console.log(`✅ File uploaded to MinIO: ${key}`);

      // Save to database
      const media = new Media({
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: fileBuffer.length,
        bucket: bucketName,
        key,
        url,
        thumbnailUrl,
        altText,
        caption,
        folder: sanitizedFolder,
        metadata,
        uploadedBy: req.user._id,
      });

      await media.save();

      // Log activity
      await Activity.logActivity(
        'media_upload',
        req.user,
        'media',
        media._id,
        {
          filename: media.originalName,
          size: formatFileSize(media.size),
          type: media.mimeType,
          folder: media.folder,
        },
        req,
      );

      res.status(201).json({
        message: 'File uploaded successfully',
        media: {
          id: media._id,
          filename: media.filename,
          originalName: media.originalName,
          url: media.url,
          thumbnailUrl: media.thumbnailUrl,
          size: media.size,
          mimeType: media.mimeType,
          folder: media.folder,
          altText: media.altText,
          caption: media.caption,
          metadata: media.metadata,
          createdAt: media.createdAt,
        },
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to upload file', 
      });
    }
  },
);

/**
 * @route GET /api/media/stats/storage
 * @desc Get storage statistics
 * @access Private (requires manage_media privilege)
 */
router.get('/stats/storage', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const stats = await Media.getStorageStats();

    res.json({
      stats: {
        ...stats,
        totalSizeFormatted: formatFileSize(stats.totalSize),
      },
    });
  } catch (error) {
    console.error('❌ Storage stats error:', error);
    res.status(500).json({ message: 'Failed to fetch storage statistics' });
  }
});

/**
 * @route GET /api/media/stats/folders
 * @desc Get folder statistics
 * @access Private (requires manage_media privilege)
 */
router.get('/stats/folders', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const folderStats = await Media.getFolderStats();

    const formattedStats = folderStats.map(stat => ({
      folder: stat._id,
      count: stat.count,
      totalSize: stat.totalSize,
      totalSizeFormatted: formatFileSize(stat.totalSize),
    }));

    res.json({ folders: formattedStats });
  } catch (error) {
    console.error('❌ Folder stats error:', error);
    res.status(500).json({ message: 'Failed to fetch folder statistics' });
  }
});

/**
 * @route GET /api/media/folders/list
 * @desc Get list of all folders
 * @access Private (requires manage_media privilege)
 */
router.get('/folders/list', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const folders = await Media.distinct('folder', { deletedAt: null });
    res.json({ folders: folders.sort() });
  } catch (error) {
    console.error('❌ Fetch folders error:', error);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
});

/**
 * @route POST /api/media/bulk/delete
 * @desc Bulk delete multiple media files
 * @access Private (requires manage_media privilege)
 */
router.post('/bulk/delete', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No media IDs provided' });
    }

    const media = await Media.find({ _id: { $in: ids }, deletedAt: null });

    if (media.length === 0) {
      return res.status(404).json({ message: 'No media found to delete' });
    }

    // Check if any media is in use
    const inUse = media.filter(m => m.usedIn.length > 0);
    if (inUse.length > 0) {
      return res.status(400).json({
        message: `Cannot delete ${inUse.length} media file(s) that are currently in use`,
        inUse: inUse.map(m => ({ id: m._id, filename: m.originalName })),
      });
    }

    // Delete from MinIO and database
    const deletePromises = media.map(async item => {
      await deleteFile(item.key);
      if (item.thumbnailUrl) {
        const thumbnailKey = `${item.folder}/thumbnails/${item.filename}`;
        await deleteFile(thumbnailKey);
      }
      await item.softDelete();
    });

    await Promise.all(deletePromises);

    // Log activity (use first media ID as targetId since bulk operations don't have single target)
    await Activity.logActivity(
      'media_bulk_delete',
      req.user,
      'media',
      media[0]?._id || new mongoose.Types.ObjectId(),
      { count: media.length, ids: media.map(m => m._id) },
      req,
    );

    res.json({
      message: `Successfully deleted ${media.length} media file(s)`,
      deletedCount: media.length,
    });
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({ message: 'Failed to delete media files' });
  }
});

/**
 * @route GET /api/media
 * @desc Get all media with pagination and filtering
 * @access Private (requires manage_media privilege)
 */
router.get('/', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      folder,
      mimeType,
      search,
      sort = '-createdAt',
    } = req.query;

    const query = { deletedAt: null };

    // Filter by folder
    if (folder && folder !== 'all') {
      query.folder = folder;
    }

    // Filter by MIME type (e.g., "image" to get all images)
    if (mimeType) {
      query.mimeType = new RegExp(mimeType, 'i');
    }

    // Search by filename or alt text
    if (search) {
      query.$or = [
        { originalName: new RegExp(search, 'i') },
        { altText: new RegExp(search, 'i') },
        { caption: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Media.countDocuments(query);
    
    const media = await Media.find(query)
      .populate('uploadedBy', 'username fullName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format response
    const formattedMedia = media.map(item => ({
      ...item,
      sizeFormatted: formatFileSize(item.size),
    }));

    res.json({
      media: formattedMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('❌ Fetch media error:', error);
    res.status(500).json({ message: 'Failed to fetch media' });
  }
});

/**
 * @route GET /api/media/:id
 * @desc Get single media by ID with detailed information
 * @access Private (requires manage_media privilege)
 */
router.get('/:id', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'username fullName email')
      .populate('usedIn.id')
      .lean();

    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media not found' });
    }

    res.json({
      media: {
        ...media,
        sizeFormatted: formatFileSize(media.size),
      },
    });
  } catch (error) {
    console.error('❌ Fetch media error:', error);
    res.status(500).json({ message: 'Failed to fetch media' });
  }
});

/**
 * @route PUT /api/media/:id
 * @desc Update media metadata (alt text, caption, folder)
 * @access Private (requires manage_media privilege)
 */
router.put('/:id', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const { altText, caption, folder } = req.body;
    
    const media = await Media.findById(req.params.id);
    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Update fields
    if (altText !== undefined) media.altText = altText;
    if (caption !== undefined) media.caption = caption;
    if (folder !== undefined) {
      media.folder = sanitizeFolderName(folder);
    }

    await media.save();

    // Log activity
    await Activity.logActivity(
      'media_update',
      req.user,
      'media',
      media._id,
      {
        filename: media.originalName,
        updates: { altText, caption, folder },
      },
      req,
    );

    res.json({
      message: 'Media updated successfully',
      media,
    });
  } catch (error) {
    console.error('❌ Update media error:', error);
    res.status(500).json({ message: 'Failed to update media' });
  }
});

/**
 * @route DELETE /api/media/:id
 * @desc Delete media file (soft delete with MinIO cleanup)
 * @access Private (requires manage_media privilege)
 */
router.delete('/:id', auth, checkRole(['manage_media']), async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Check if media is being used
    if (media.usedIn.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete media that is currently in use',
        usedIn: media.usedIn,
      });
    }

    // Delete from MinIO
    await deleteFile(media.key);
    console.log(`✅ Deleted from MinIO: ${media.key}`);

    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailKey = `${media.folder}/thumbnails/${media.filename}`;
      await deleteFile(thumbnailKey);
      console.log(`✅ Deleted thumbnail from MinIO: ${thumbnailKey}`);
    }

    // Soft delete from database
    await media.softDelete();

    // Log activity
    await Activity.logActivity(
      'media_delete',
      req.user,
      'media',
      media._id,
      {
        filename: media.originalName,
        size: formatFileSize(media.size),
      },
      req,
    );

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('❌ Delete media error:', error);
    res.status(500).json({ message: 'Failed to delete media' });
  }
});

// =============================================
// Phase 3: Advanced Media Management
// =============================================

/**
 * @route GET /api/media/orphaned
 * @desc Get list of orphaned media files
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/orphaned',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const { graceDays = 7, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Find orphaned media beyond grace period
      const orphanedMedia = await Media.findOrphaned(parseInt(graceDays))
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'username fullName')
        .sort({ orphanedSince: 1 }); // Oldest first

      // Get total count
      const allOrphaned = await Media.findOrphaned(parseInt(graceDays));
      const total = allOrphaned.length;

      // Calculate total size
      const totalSize = orphanedMedia.reduce((sum, media) => sum + media.size, 0);

      res.json({
        orphanedMedia,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        summary: {
          count: orphanedMedia.length,
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          graceDays: parseInt(graceDays),
        },
      });
    } catch (error) {
      console.error('❌ Get orphaned media error:', error);
      res.status(500).json({ message: 'Failed to fetch orphaned media' });
    }
  }
);

/**
 * @route GET /api/media/orphaned/stats
 * @desc Get statistics about orphaned media
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/orphaned/stats',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const stats = await Media.getOrphanedStats();
      res.json(stats);
    } catch (error) {
      console.error('❌ Get orphaned stats error:', error);
      res.status(500).json({ message: 'Failed to fetch orphaned statistics' });
    }
  }
);

/**
 * @route POST /api/media/orphaned/cleanup
 * @desc Clean up orphaned media files
 * @access Private (requires manage_media privilege)
 */
router.post(
  '/orphaned/cleanup',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const { graceDays = 30, dryRun = false, mediaIds } = req.body;

      let mediaToDelete;

      // If specific IDs provided, use those
      if (mediaIds && Array.isArray(mediaIds)) {
        mediaToDelete = await Media.find({
          _id: { $in: mediaIds },
          deletedAt: null,
          usedIn: { $size: 0 },
        });
      } else {
        // Otherwise, find all orphaned media beyond grace period
        mediaToDelete = await Media.findOrphaned(parseInt(graceDays));
      }

      if (mediaToDelete.length === 0) {
        return res.json({
          message: 'No orphaned media found to cleanup',
          deletedCount: 0,
          dryRun,
        });
      }

      const deletionResults = {
        success: [],
        failed: [],
        totalSize: 0,
      };

      // Dry run mode - just report what would be deleted
      if (dryRun) {
        const totalSize = mediaToDelete.reduce((sum, media) => sum + media.size, 0);
        
        return res.json({
          message: 'Dry run completed',
          dryRun: true,
          wouldDelete: mediaToDelete.map(m => ({
            id: m._id,
            filename: m.originalName,
            size: formatFileSize(m.size),
            orphanedSince: m.orphanedSince,
            url: m.url,
          })),
          summary: {
            count: mediaToDelete.length,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          },
        });
      }

      // Actually delete the media
      for (const media of mediaToDelete) {
        try {
          // Delete from MinIO
          await deleteFile(media.key);
          
          // Delete thumbnail if exists
          if (media.thumbnailUrl) {
            const thumbnailKey = `${media.folder}/thumbnails/${media.filename}`;
            await deleteFile(thumbnailKey);
          }

          // Soft delete from database
          await media.softDelete();

          deletionResults.success.push({
            id: media._id,
            filename: media.originalName,
            size: media.size,
          });
          deletionResults.totalSize += media.size;

        } catch (error) {
          console.error(`❌ Failed to delete media ${media._id}:`, error);
          deletionResults.failed.push({
            id: media._id,
            filename: media.originalName,
            error: error.message,
          });
        }
      }

      // Log bulk activity
      await Activity.logActivity(
        'media_bulk_delete',
        req.user,
        'media',
        deletionResults.success[0]?.id || new mongoose.Types.ObjectId(),
        {
          action: 'orphaned_cleanup',
          count: deletionResults.success.length,
          totalSize: formatFileSize(deletionResults.totalSize),
          graceDays: parseInt(graceDays),
          ids: deletionResults.success.map(m => m.id),
        },
        req,
      );

      res.json({
        message: `Cleaned up ${deletionResults.success.length} orphaned media files`,
        deletedCount: deletionResults.success.length,
        failedCount: deletionResults.failed.length,
        totalSize: deletionResults.totalSize,
        totalSizeMB: (deletionResults.totalSize / (1024 * 1024)).toFixed(2),
        results: deletionResults,
        dryRun: false,
      });

    } catch (error) {
      console.error('❌ Cleanup orphaned media error:', error);
      res.status(500).json({ message: 'Failed to cleanup orphaned media' });
    }
  }
);

/**
 * @route GET /api/media/analytics/dashboard
 * @desc Get comprehensive analytics dashboard
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/dashboard',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const dashboard = await getAnalyticsDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('❌ Get analytics dashboard error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics dashboard' });
    }
  }
);

/**
 * @route GET /api/media/analytics/usage
 * @desc Get media usage statistics
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/usage',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const stats = await getUsageStatistics();
      res.json(stats);
    } catch (error) {
      console.error('❌ Get usage statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  }
);

/**
 * @route GET /api/media/analytics/popular
 * @desc Get most and least used media
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/popular',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const [mostUsed, leastUsed] = await Promise.all([
        getMostUsedMedia(parseInt(limit)),
        getLeastUsedMedia(parseInt(limit)),
      ]);
      
      res.json({
        mostUsed,
        leastUsed,
      });
    } catch (error) {
      console.error('❌ Get popular media error:', error);
      res.status(500).json({ message: 'Failed to fetch popular media' });
    }
  }
);

/**
 * @route GET /api/media/analytics/storage
 * @desc Get storage statistics
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/storage',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const storage = await getStorageByUsage();
      res.json(storage);
    } catch (error) {
      console.error('❌ Get storage statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch storage statistics' });
    }
  }
);

/**
 * @route GET /api/media/analytics/timeline
 * @desc Get upload timeline
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/timeline',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const timeline = await getUploadTimeline(parseInt(days));
      res.json(timeline);
    } catch (error) {
      console.error('❌ Get upload timeline error:', error);
      res.status(500).json({ message: 'Failed to fetch upload timeline' });
    }
  }
);

/**
 * @route GET /api/media/analytics/by-type
 * @desc Get media breakdown by type
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/by-type',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const byType = await getMediaByType();
      res.json(byType);
    } catch (error) {
      console.error('❌ Get media by type error:', error);
      res.status(500).json({ message: 'Failed to fetch media by type' });
    }
  }
);

/**
 * @route GET /api/media/analytics/by-uploader
 * @desc Get media statistics by uploader
 * @access Private (requires manage_media privilege)
 */
router.get(
  '/analytics/by-uploader',
  auth,
  checkRole(['manage_media']),
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const byUploader = await getMediaByUploader(parseInt(limit));
      res.json(byUploader);
    } catch (error) {
      console.error('❌ Get media by uploader error:', error);
      res.status(500).json({ message: 'Failed to fetch media by uploader' });
    }
  }
);

module.exports = router;
