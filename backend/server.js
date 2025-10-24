require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to database only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Load models FIRST in correct order (Media before Post due to populate)
// This must be done before any routes are loaded
require('./models/Media');
require('./models/Post');

// Initialize MinIO bucket
const { initializeBucket } = require('./config/minio');
if (process.env.NODE_ENV !== 'test') {
  initializeBucket();
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(require('./middleware/sanitizeInput')); // Sanitize inputs to prevent NoSQL injection
app.use(require('./middleware/trimInputs')); // Trim all request body inputs

// Basic route
app.get('/', (req, res) => {
  res.send('MyBlog API is running...');
});

// Public routes (unprotected, rate-limited)
app.use('/api/public', require('./routes/public'));

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// User routes (protected)
const authMiddleware = require('./middleware/auth');
app.use('/api/users', require('./routes/users'));

// Role routes (protected)
app.use('/api/roles', authMiddleware, require('./routes/roles'));

// Privilege routes (protected)
app.use('/api/privileges', authMiddleware, require('./routes/privileges'));

// Blog post routes (protected)
app.use('/api/posts', authMiddleware, require('./routes/posts'));

// Tag routes (protected)
app.use('/api/tags', authMiddleware, require('./routes/tags'));

// Admin routes (protected)
app.use('/api/admin', authMiddleware, require('./routes/admin'));

// Media routes (protected - requires manage_media privilege)
app.use('/api/media', authMiddleware, require('./routes/media'));

// Account routes (protected)
app.use('/api/account', authMiddleware, require('./routes/account'));

// Comments routes (mixed - some public, some protected)
app.use('/api/comments', require('./routes/comments'));

// Password reset routes (public)
app.use('/api/password', require('./routes/password'));

// Global error handler (must be last)
app.use(require('./middleware/secureErrorHandler'));

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;