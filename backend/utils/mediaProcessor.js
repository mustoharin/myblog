const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Generate unique filename with UUID
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename with extension
 */
const generateFilename = originalName => {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = uuidv4();
  const timestamp = Date.now();
  return `${timestamp}-${uuid}${ext}`;
};

/**
 * Generate sanitized folder name
 * @param {string} folder - Folder name
 * @returns {string} - Sanitized folder name
 */
const sanitizeFolderName = folder => {
  if (!folder || folder === 'all') {
    return 'uncategorized';
  }
  return folder
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Optimize image using sharp
 * Resizes if too large, converts format if needed, and compresses
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Optimized buffer and metadata
 */
const optimizeImage = async (buffer, options = {}) => {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1920;
    const quality = options.quality || 85;

    // Resize if image is too large
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert and optimize based on format
    let optimized;
    let outputFormat = metadata.format;

    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        optimized = await image
          .jpeg({ quality, progressive: true, mozjpeg: true })
          .toBuffer();
        outputFormat = 'jpeg';
        break;
      
      case 'png':
        optimized = await image
          .png({ compressionLevel: 9, palette: true })
          .toBuffer();
        outputFormat = 'png';
        break;
      
      case 'webp':
        optimized = await image
          .webp({ quality, effort: 6 })
          .toBuffer();
        outputFormat = 'webp';
        break;
      
      case 'gif':
        // For GIF, don't optimize to preserve animation
        optimized = buffer;
        outputFormat = 'gif';
        break;
      
      default:
        // For other formats, try to convert to JPEG
        optimized = await image
          .jpeg({ quality, progressive: true })
          .toBuffer();
        outputFormat = 'jpeg';
    }

    // Get final metadata
    const finalImage = sharp(optimized);
    const finalMetadata = await finalImage.metadata();

    return {
      buffer: optimized,
      metadata: {
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: outputFormat,
        isOptimized: true,
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        compressionRatio: ((buffer.length - optimized.length) / buffer.length * 100).toFixed(2),
      },
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
};

/**
 * Create thumbnail from image
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Buffer>} - Thumbnail buffer
 */
const createThumbnail = async (buffer, options = {}) => {
  try {
    const width = options.width || 300;
    const height = options.height || 300;
    const quality = options.quality || 80;

    const thumbnail = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw new Error(`Failed to create thumbnail: ${error.message}`);
  }
};

/**
 * Create multiple thumbnail sizes
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Object>} - Object with different thumbnail sizes
 */
const createMultipleThumbnails = async buffer => {
  try {
    const [small, medium, large] = await Promise.all([
      createThumbnail(buffer, { width: 150, height: 150 }),
      createThumbnail(buffer, { width: 300, height: 300 }),
      createThumbnail(buffer, { width: 600, height: 600 }),
    ]);

    return {
      small,
      medium,
      large,
    };
  } catch (error) {
    console.error('Multiple thumbnails creation error:', error);
    throw new Error('Failed to create multiple thumbnails');
  }
};

/**
 * Get file type category from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - File category
 */
const getFileCategory = mimeType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'other';
};

/**
 * Validate image dimensions
 * @param {Buffer} buffer - Image buffer
 * @param {Object} constraints - Min/max width and height
 * @returns {Promise<boolean>} - True if valid, throws error if not
 */
const validateImageDimensions = async (buffer, constraints = {}) => {
  try {
    const metadata = await sharp(buffer).metadata();
    
    const {
      minWidth = 0,
      maxWidth = 5000,
      minHeight = 0,
      maxHeight = 5000,
    } = constraints;

    if (metadata.width < minWidth || metadata.width > maxWidth) {
      throw new Error(
        `Image width must be between ${minWidth}px and ${maxWidth}px`,
      );
    }

    if (metadata.height < minHeight || metadata.height > maxHeight) {
      throw new Error(
        `Image height must be between ${minHeight}px and ${maxHeight}px`,
      );
    }

    return true;
  } catch (error) {
    if (error.message.includes('must be between')) {
      throw error;
    }
    throw new Error('Invalid image file');
  }
};

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Extract EXIF data from image
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} - EXIF data
 */
const extractExifData = async buffer => {
  try {
    const metadata = await sharp(buffer).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
    };
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return {};
  }
};

module.exports = {
  generateFilename,
  sanitizeFolderName,
  optimizeImage,
  createThumbnail,
  createMultipleThumbnails,
  getFileCategory,
  validateImageDimensions,
  formatFileSize,
  extractExifData,
};
