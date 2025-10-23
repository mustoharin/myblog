# MyBlog Backend API

A robust, production-ready Node.js/Express REST API with enterprise-grade security, comprehensive testing, and role-based access control.

![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![Express](https://img.shields.io/badge/express-4.x-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-6.x-green.svg)
![Tests](https://img.shields.io/badge/tests-379%20passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen.svg)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 6.x
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run init-db

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/blog

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (for password reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Testing
NODE_ENV=test
TEST_BYPASS_CAPTCHA_TOKEN=your_secure_test_token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
```

---

## ✨ Key Features

### 🔐 Security
- **JWT Authentication** - Stateless auth with 7-day expiration
- **CAPTCHA Protection** - Bot prevention on login
- **RBAC System** - 15+ privileges across 6 modules
- **Password Security** - bcrypt + complexity validation
- **Rate Limiting** - Configurable per endpoint
- **XSS Protection** - DOMPurify sanitization
- **NoSQL Injection Prevention** - Input validation

### 👥 User Management
- Complete CRUD with privilege checking
- Full name display support
- Active/Inactive account status
- Last login tracking
- Secure password reset flow

### 💬 Comment System
- Unified comment model
- Admin moderation tools
- Privilege-based access
- CAPTCHA for anonymous comments

### 📝 Content Management
- Rich text with HTML sanitization
- Draft/Published workflow
- Tag management
- View count tracking (atomic operations)
- Soft delete with restore

### 📊 Admin Dashboard
- Real-time statistics
- Popular posts analytics
- Active users monitoring
- System health metrics
- Recent activity feed

### 🧪 Testing
- **379 tests passing** (100% pass rate)
- **99%+ code coverage**
- **20 test suites**

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

#### Get CAPTCHA
```http
GET /auth/captcha
```

**Response:**
```json
{
  "sessionId": "string",
  "imageDataUrl": "data:image/png;base64,..."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "username": "admin",
  "password": "password",
  "captchaSessionId": "session-id",
  "captchaText": "ABCD"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "..."
  }
}
```

### Admin Endpoints

#### Get Dashboard Statistics
```http
GET /admin/stats
Authorization: Bearer <token>
```
**Requires:** `view_analytics` privilege

**Response:**
```json
{
  "totalPosts": 150,
  "totalUsers": 45,
  "totalViews": 25000,
  "totalComments": 380,
  "activeUsers": 12
}
```

#### Get Popular Posts
```http
GET /admin/posts/popular?timeframe=week&limit=10
Authorization: Bearer <token>
```
**Requires:** `view_analytics` privilege

**Query Parameters:**
- `timeframe`: `day` | `week` | `month` | `year`
- `limit`: max 50

#### Get System Status
```http
GET /admin/system/status
Authorization: Bearer <token>
```
**Requires:** `view_analytics` privilege

**Response:**
```json
{
  "database": {
    "storageSize": 104857600,
    "collections": 8
  },
  "memory": {
    "heapUsed": 45678912,
    "heapTotal": 104857600
  },
  "uptime": 86400
}
```

### Public Endpoints

#### Get Published Posts
```http
GET /public/posts?page=1&limit=10&search=react&tags=nodejs
```

#### Track Post View
```http
POST /public/posts/:id/view
```

---

## 📋 Data Models

### User
```javascript
{
  _id: ObjectId,
  username: String, // XSS protected, required, unique
  fullName: String, // XSS protected, optional, author's display name
  email: String, // Validated email format, required, unique
  password: String, // Hashed with bcrypt, required
  role: ObjectId (ref: 'Role'), // Required
  isActive: Boolean, // User account status (default: true)
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date, // Tracks last successful login timestamp
  createdAt: Date, // Explicit field with default: Date.now
  updatedAt: Date  // Explicit field, updated by pre-save middleware
}
```

**User Fields:**
- `username`: Unique identifier for the user (used for login)
- `fullName`: Optional display name shown as author on blog posts (e.g., "John Doe")
- `email`: User's email address for notifications and password recovery
- `password`: Securely hashed using bcrypt
- `role`: Reference to the user's role (defines permissions)
- `isActive`: Account status - inactive users cannot login
- `lastLogin`: Timestamp of the last successful authentication
- `resetPasswordToken`: Temporary token for password reset flow
- `resetPasswordExpires`: Expiration time for reset token
- `createdAt`: Explicit timestamp field set on document creation
- `updatedAt`: Explicit timestamp field updated automatically on save operations

### Post
```javascript
{
  _id: ObjectId,
  title: String, // XSS protected
  content: String, // Supports rich HTML with sanitization
  excerpt: String, // Short description
  author: ObjectId (ref: 'User'),
  tags: [String], // Array of tag strings
  views: Number, // Tracks post view count (default: 0)
  isPublished: Boolean,
  comments: [{
    content: String, // XSS protected
    author: ObjectId (ref: 'User'),
    name: String, // For non-authenticated commenters
    createdAt: Date
  }],
  createdAt: Date, // Explicit field with default: Date.now
  updatedAt: Date  // Explicit field, updated by pre-save middleware
}
```

**Post Indexes:**
- Text index on `title` and `content` for search functionality
- Index on `tags` for efficient tag filtering
- Index on `views` (descending) for popular posts queries
- Index on `createdAt` (descending) for chronological ordering
- Index on `updatedAt` (descending) for recent activity tracking

**Timestamp Behavior:**
- `createdAt`: Explicit Date field with `default: Date.now`, set automatically when document is first saved
- `updatedAt`: Explicit Date field with `default: Date.now`, updated automatically by pre-save middleware
- **Middleware**: Both `save()` and `findOneAndUpdate()` operations trigger automatic `updatedAt` updates
- **Consistency**: All models (Post, User, Role, Privilege) use the same explicit timestamp pattern
- Recent activity endpoint handles timestamp comparison for distinguishing creates vs updates

### Role
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  description: String, // Supports rich HTML with sanitization
  privileges: [ObjectId] (ref: 'Privilege'),
  createdAt: Date, // Explicit field with default: Date.now
  updatedAt: Date  // Explicit field, updated by pre-save middleware
}
```

### Privilege
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  code: String, // XSS protected, unique identifier
  description: String, // Supports rich HTML with sanitization
  createdAt: Date, // Explicit field with default: Date.now
  updatedAt: Date  // Explicit field, updated by pre-save middleware
}
```

**Timestamp Management:**
All models use consistent explicit timestamp fields with pre-save middleware for automatic `updatedAt` updates.

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific test
npm test -- auth.test.js

# Run by pattern
npm test -- --testNamePattern="Last Login"
```

### Test Suite Overview
The project includes comprehensive test coverage with **379 tests passing** (0 skipped) across 20 test suites:

**Test Files:**
- `auth.test.js` (18 tests) - Authentication, JWT validation, last login tracking
- `admin.test.js` (32 tests) - Dashboard statistics, analytics, system health monitoring
- `users.test.js` (28 tests) - User CRUD operations, fullName, isActive status
- `posts.test.js` (17 tests) - Post management and rich content validation
- `tags.test.js` (37 tests) - Tag management, statistics, RBAC, soft delete
- `comments.routes.test.js` (28 tests) - Comment CRUD with privilege-based auth
- `comments.middleware.test.js` (18 tests) - Comment authorization middleware
- `comments.model.test.js` (12 tests) - Comment model validation
- `roles.test.js` (20 tests) - Role management, content tests, data integrity
- `privileges.test.js` (8 tests) - Privilege management, content tests
- `public.test.js` (22 tests) - Public API, view tracking, search
- `captcha.test.js` (11 tests) - CAPTCHA generation and validation
- `password.test.js` (9 tests) - Password reset functionality
- `change-password.test.js` (7 tests) - Password change validation
- `password-validator.test.js` (32 tests) - Password strength validation
- `pagination.test.js` (10 tests) - Pagination across all endpoints
- `search.test.js` (7 tests) - Search and tag filtering
- `trim-inputs.test.js` (5 tests) - Input sanitization
- `roles.content.test.js` (4 tests) - Rich content in role descriptions
- `privileges.content.test.js` (4 tests) - Rich content in privilege descriptions

**Test Results:** ✅ **379 tests passing, 0 skipped** - 100% pass rate with 99%+ code coverage

---

## 🛡️ Security

### Authentication & Authorization
- **JWT Authentication** - 7-day expiration, stateless tokens
- **CAPTCHA** - Bot prevention on login
- **RBAC** - 15+ privileges across 6 modules (user, role, content, comment, system, auth)
- **Password Security** - bcrypt hashing + complexity validation
- **Account Status** - Admin can activate/deactivate users

### Input Protection
- **XSS Prevention** - DOMPurify sanitization on all inputs
- **NoSQL Injection** - Middleware blocks dangerous operators
- **Email Validation** - RFC 5322 compliant format checking
- **Input Sanitization** - Trim whitespace, length limits

### Rate Limiting
- **Base Limiter** - 1000 requests/15 minutes per IP
- **Comment Limiter** - 10 comments/hour per IP
- **Configurable** - Environment-based thresholds

### Data Protection
- **Soft Delete** - Data preservation for recovery
- **Atomic Operations** - Race condition prevention (view counts)
- **Referential Integrity** - Cascade deletion for related data
- **Audit Logging** - Last login, activity tracking

---

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure production MongoDB URI
- [ ] Set up email service for password reset
- [ ] Configure CORS for your domain
- [ ] Set NODE_ENV=production
- [ ] Remove TEST_BYPASS_CAPTCHA_TOKEN
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting for production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Set up error tracking (e.g., Sentry)

### Docker

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down -v
```

---

## 🎯 Recent Improvements (Version 2.1)

### Enhanced Testing
- **379 tests passing** (from 319) - 100% pass rate, 0 skipped
- **99%+ code coverage** maintained across all modules
- **20 test suites** covering all features

### Security Hardening
- **Pure RBAC** - All routes use privilege-based access
- **Tags Routes** - Fixed to use `manage_tags` privilege
- **Admin Routes** - Proper privilege enforcement
- **Comment System** - Complete privilege coverage (58 tests)

### New Capabilities
- **Post Views** - Atomic tracking with analytics
- **Last Login** - Security auditing and monitoring
- **Full Name** - Professional author attribution
- **Account Status** - Admin-controlled activation/deactivation
- **System Health** - Real-time monitoring dashboard

---

## � Project Statistics

- **379 Tests** - 100% pass rate, 0 skipped
- **99%+ Coverage** - All modules thoroughly tested
- **15+ Privileges** - Granular RBAC across 6 modules
- **Production Ready** - Enterprise-grade security

---

## 📖 Related Documentation
- **Root README**: [../README.md](../README.md) - Project overview
- **Frontend**: [../frontend/README.md](../frontend/README.md) - React app docs

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Write tests (maintain 99%+ coverage)
4. Ensure all tests pass: `npm test`
5. Commit: `git commit -m 'feat: add feature'`
6. Push and open Pull Request

---

## 📄 License

MIT License - See [LICENSE](../LICENSE)

---

<div align="center">

**Built with ❤️ using Node.js, Express, and MongoDB**

[Report Bug](../../issues) · [Request Feature](../../issues/new) · [View Tests](./tests/)

</div>
