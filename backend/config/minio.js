const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const bucketName = process.env.MINIO_BUCKET || 'blog-media';

/**
 * Initialize MinIO bucket
 * Ensures bucket exists and sets public-read policy
 */
const initializeBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ MinIO: Bucket "${bucketName}" created successfully`);
      
      // Set bucket policy to public-read for media files
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ MinIO: Bucket "${bucketName}" policy set to public-read`);
    } else {
      console.log(`✅ MinIO: Bucket "${bucketName}" already exists`);
    }
  } catch (error) {
    console.error('❌ MinIO: Error initializing bucket:', error.message);
    // Don't throw error to prevent server from crashing
    // Media upload will fail gracefully if MinIO is unavailable
  }
};

/**
 * Upload file to MinIO
 * @param {string} key - Object key (path) in bucket
 * @param {Buffer} buffer - File buffer
 * @param {number} size - File size in bytes
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadFile = async (key, buffer, size, contentType) => {
  try {
    await minioClient.putObject(
      bucketName,
      key,
      buffer,
      size,
      { 'Content-Type': contentType },
    );
    
    const publicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
    return `${publicUrl}/${bucketName}/${key}`;
  } catch (error) {
    console.error('❌ MinIO: Upload error:', error.message);
    throw new Error('Failed to upload file to storage');
  }
};

/**
 * Delete file from MinIO
 * @param {string} key - Object key (path) in bucket
 */
const deleteFile = async key => {
  try {
    await minioClient.removeObject(bucketName, key);
    console.log(`✅ MinIO: Deleted file: ${key}`);
  } catch (error) {
    console.error('❌ MinIO: Delete error:', error.message);
    throw new Error('Failed to delete file from storage');
  }
};

/**
 * Check if file exists in MinIO
 * @param {string} key - Object key (path) in bucket
 * @returns {Promise<boolean>}
 */
const fileExists = async key => {
  try {
    await minioClient.statObject(bucketName, key);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

module.exports = {
  minioClient,
  bucketName,
  initializeBucket,
  uploadFile,
  deleteFile,
  fileExists,
};
