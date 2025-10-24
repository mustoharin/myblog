const multer = require('multer');
const path = require('path');

/**
 * File filter for validation
 * Only allows specific image types and PDF files
 */
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  
  // Allowed document types
  const allowedDocumentTypes = [
    'application/pdf',
  ];
  
  const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, WebP, GIF, and PDF files are allowed.',
      ),
      false,
    );
  }
};

/**
 * Configure multer for memory storage
 * Files are stored in memory as Buffer objects for processing before upload to MinIO
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1, // Single file upload
  },
  fileFilter,
});

/**
 * Error handler middleware for multer errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum file size is 10MB.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Only one file can be uploaded at a time.',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected field name. Please use "file" as the field name.',
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
};

module.exports = {
  upload,
  handleUploadError,
};
