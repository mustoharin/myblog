# Blog API Documentation

## Overview
This is a RESTful API for a blog application with role-based access control (RBAC). It provides both public and protected endpoints for managing users, posts, roles, and privileges.

## Authentication

### Get Captcha
```http
GET /api/auth/captcha
```
Returns a new captcha image and session ID for authentication.

**Response**
```json
{
  "sessionId": "string",
  "imageDataUrl": "string (base64 encoded image)"
}
```

### Refresh Captcha
```http
POST /api/auth/captcha/refresh
```
Refreshes an existing captcha while maintaining the same session ID. Use this when the user wants a new captcha image.

**Request Body**
```json
{
  "sessionId": "string"
}
```

**Response**
```json
{
  "sessionId": "string",
  "imageDataUrl": "string (base64 encoded image)"
}
```

**Error Responses**
```json
{
  "message": "Session ID is required"
}
```
Status: 400 Bad Request

### Login
```http
POST /api/auth/login
```
Authenticate a user and get a JWT token.

**Request Body**
```json
{
  "username": "string",
  "password": "string",
  // Standard CAPTCHA validation
  "captchaSessionId": "string",
  "captchaText": "string",
  // Or for E2E testing environment
  "testBypassToken": "string"
}
```

**CAPTCHA Bypass for Testing**
For E2E testing environments, you can bypass CAPTCHA validation by:
1. Setting `TEST_BYPASS_CAPTCHA_TOKEN` in your `.env` file
2. Including the token in your request as `testBypassToken`

Example test environment setup:
```env
TEST_BYPASS_CAPTCHA_TOKEN=your_secure_token_here
```

**Response**
```json
{
  "token": "string (JWT token)",
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": {
      "_id": "string",
      "name": "string",
      "privileges": [
        {
          "_id": "string",
          "name": "string",
          "code": "string"
        }
      ]
    }
  }
}
```

**Error Responses**
- `400 Bad Request`: Missing required fields or invalid captcha
- `401 Unauthorized`: Invalid credentials

### Public Access
The following endpoints are publicly accessible with rate limiting:
- List published posts with pagination
- View individual posts
- Add comments with CAPTCHA verification

Rate Limits:
- General browsing: 100 requests per 15 minutes per IP
- Commenting: 10 comments per hour per IP

## Content Validation

### Rich Content Fields
The following fields support rich HTML content with automatic sanitization:
- Post content
- Role descriptions
- Privilege descriptions

Allowed HTML elements and attributes:
- Headings: `<h1>` through `<h6>` with `id` and `class` attributes
- Text formatting: `<p>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<strike>`, `<del>`, `<u>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Tables: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` with `align` attribute
- Links: `<a>` with `href`, `title`, `target` attributes
- Images: `<img>` with `src`, `alt`, `title`, `width`, `height` attributes

## Development Setup

### Prerequisites
- Node.js
- MongoDB
- Docker and Docker Compose (optional)

### Environment Variables
Create a `.env` file in the backend directory:

For Development:
```env
NODE_ENV=development
PORT=5002
MONGODB_URI=mongodb://admin:password123@localhost:27018/myblog?authSource=admin
JWT_SECRET=your_jwt_secret
```

For Testing (additional variables):
```env
NODE_ENV=test
TEST_BYPASS_CAPTCHA_TOKEN=e2e_test_bypass_captcha_2025  # Token for bypassing CAPTCHA in tests
```

The test environment uses:
- In-memory MongoDB for tests
- Faster rate limiting windows (100ms instead of hours)
- CAPTCHA bypass capability for E2E testing

### Docker Setup
Run the database using Docker Compose:
```bash
docker compose up -d
```

### Initialize Database
Run the database initialization script:
```bash
cd backend
MONGODB_URI="mongodb://admin:password123@localhost:27018/myblog?authSource=admin" node init-db.js
```

This will create:
- Default privileges (create_user, read_user, update_user, delete_user, manage_roles, etc.)
- Superadmin role with all privileges
- Admin role with post management privileges
- Default superadmin user:
  - Username: superadmin
  - Password: superadmin123

### Start the Server
```bash
cd backend
node server.js
```

## Testing

### Start Test Server
```bash
cd backend
node start-test-server.js
```

The test server uses an in-memory MongoDB instance and includes:
- Mock captcha validation (always accepts "123456" as the captcha text)
- Pre-initialized test data with the same superadmin user
- Same API endpoints as production server

### Example Test Requests

**Standard Login (with CAPTCHA)**
```bash
# Get a captcha
curl http://localhost:5002/api/auth/captcha

# Login with test credentials
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123",
    "captchaSessionId": "SESSION_ID_FROM_CAPTCHA",
    "captchaText": "123456"
  }'
```

**Test Environment Login (with CAPTCHA bypass)**
```bash
# Login using bypass token
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123",
    "testBypassToken": "e2e_test_bypass_captcha_2025"
  }'
```

**Add Comment (with CAPTCHA bypass)**
```bash
# Add a comment using bypass token
curl -X POST http://localhost:5002/api/public/posts/POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test comment",
    "name": "Test User",
    "testBypassToken": "e2e_test_bypass_captcha_2025"
  }'
```
    "captchaText": "123456"
  }'
```
- Code blocks: `<pre>`, `<code>` with `class` for syntax highlighting
- Other: `<blockquote>`, `<br>`, `<hr>`

Unsafe content (scripts, event handlers, etc.) is automatically stripped.

### XSS Protection
All other text fields are protected against XSS attacks using strict validation that allows only basic text content.

## Authentication
The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Role-Based Access Control
The system implements RBAC with three default roles:
- `superadmin`: Full system access
- `admin`: Post management access
- `regular`: Basic read access

## API Endpoints

### Public Endpoints
- **GET /api/public/posts**
  - List published posts with optional search and tag filtering
  - Query parameters:
    - `page`: Page number (default: 1)
    - `limit`: Posts per page (default: 10, max: 50)
    - `search`: Search term to filter posts by title and content
    - `tags`: Comma-separated list of tags to filter posts
  - Returns: 
    ```json
    {
      "posts": [
        {
          "title": "string",
          "excerpt": "string",
          "createdAt": "date",
          "author": { "username": "string" },
          "tags": ["string"]
        }
      ],
      "pagination": {
        "currentPage": "number",
        "totalPages": "number",
        "totalPosts": "number",
        "hasMore": "boolean"
      }
    }
    ```

- **GET /api/public/posts/:id**
  - Get a single published post
  - Returns: Post object with comments

- **POST /api/public/posts/:id/comments**
  - Add a comment to a post
  - Rate limited: 10 comments per hour per IP
  - Request body:
    ```json
    {
      "content": "string (1-1000 chars)",
      "name": "string (1-50 chars)",
      "captchaToken": "string"
    }
    ```
  - Validation:
    - Content length: 1-1000 characters
    - Name length: 1-50 characters
    - Name: XSS protected
    - Valid CAPTCHA token required
  - Returns: Created comment object

### Authentication
- **POST /api/auth/login**
  - Login with username and password
  - Request body: `{ "username": "string", "password": "string" }`
  - Returns: `{ "token": "string", "user": {...} }`

### Users
- **GET /api/users**
  - List all users (requires `read_user` privilege)
  - Returns: Array of user objects

- **GET /api/users/:id**
  - Get user by ID (requires `read_user` privilege)
  - Returns: User object

- **POST /api/users**
  - Create new user (requires `create_user` privilege)
  - Request body:
    ```json
    {
      "username": "string",
      "email": "string",
      "password": "string",
      "role": "role_id"
    }
    ```
  - Returns: Created user object

- **PUT /api/users/:id**
  - Update user (requires `update_user` privilege)
  - Request body: Any of `{ "username", "email", "password", "role" }`
  - Returns: Updated user object

- **DELETE /api/users/:id**
  - Delete user (requires `delete_user` privilege)
  - Returns: 204 No Content

### Posts
- **GET /api/posts**
  - List all posts (requires `read_post` privilege)
  - Returns: Array of post objects

- **GET /api/posts/:id**
  - Get post by ID (requires `read_post` privilege)
  - Returns: Post object

- **POST /api/posts**
  - Create new post (requires `create_post` privilege)
  - Request body:
    ```json
    {
      "title": "string",
      "content": "string (supports rich HTML content)",
      "author": "user_id"
    }
    ```
  - Validation:
    - Title: Basic text only (XSS protected)
    - Content: Rich HTML content with automatic sanitization
  - Returns: Created post object with sanitized content

- **PUT /api/posts/:id**
  - Update post (requires `update_post` privilege)
  - Only post author or superadmin can update
  - Request body: Any of `{ "title": "string", "content": "string (supports rich HTML)" }`
  - Content is automatically sanitized
  - Returns: Updated post object with sanitized content

- **DELETE /api/posts/:id**
  - Delete post (requires `delete_post` privilege)
  - Only post author or superadmin can delete
  - Returns: 204 No Content

- **POST /api/posts/:id/comments**
  - Add comment to post (public endpoint with CAPTCHA and rate limiting)
  - Request body:
    ```json
    {
      "content": "string",
      "name": "string",
      // Standard CAPTCHA validation
      "captchaSessionId": "string",
      "captchaText": "string",
      // Or for E2E testing environment
      "testBypassToken": "string"
    }
    ```
  - Validation:
    - Content: 1 to 1000 characters
    - Name: 1 to 50 characters, XSS protected
  - Rate limiting: 5 comments per 100ms in test, 10 comments per hour in production
  - Returns: Created comment object

### Roles
- **GET /api/roles**
  - List all roles (requires `manage_roles` privilege)
  - Returns: Array of role objects

- **POST /api/roles**
  - Create new role (requires `manage_roles` privilege)
  - Request body:
    ```json
    {
      "name": "string",
      "description": "string (supports rich HTML content)",
      "privileges": ["privilege_id"]
    }
    ```
  - Validation:
    - Name: Basic text only (XSS protected)
    - Description: Rich HTML content with automatic sanitization
  - Returns: Created role object with sanitized description
  - Request body:
    ```json
    {
      "name": "string",
      "description": "string",
      "privileges": ["privilege_id"]
    }
    ```
  - Returns: Created role object

- **PUT /api/roles/:id**
  - Update role (requires `manage_roles` privilege)
  - Request body: Any of `{ "name", "description", "privileges" }`
  - Returns: Updated role object

- **DELETE /api/roles/:id**
  - Delete role (requires `manage_roles` privilege)
  - Cannot delete superadmin role or roles assigned to users
  - Returns: 204 No Content

### Privileges
- **GET /api/privileges**
  - List all privileges (requires `manage_roles` privilege)
  - Returns: Array of privilege objects

- **POST /api/privileges**
  - Create new privilege (requires `manage_roles` privilege)
  - Request body:
    ```json
    {
      "name": "string",
      "description": "string (supports rich HTML content)",
      "code": "string"
    }
    ```
  - Validation:
    - Name: Basic text only (XSS protected)
    - Description: Rich HTML content with automatic sanitization
    - Code: Basic text only (XSS protected)
  - Returns: Created privilege object with sanitized description

- **PUT /api/privileges/:id**
  - Update privilege (requires `manage_roles` privilege)
  - Request body: Any of `{ "name", "description", "code" }`
  - Returns: Updated privilege object

- **DELETE /api/privileges/:id**
  - Delete privilege (requires `manage_roles` privilege)
  - Cannot delete essential privileges or those assigned to roles
  - Returns: 200 OK

### Admin Endpoints

#### Get Dashboard Statistics
```http
GET /api/admin/stats
```
Get aggregated statistics for the admin dashboard.

**Authentication Required:** JWT token with `read_post` privilege

**Response:**
```json
{
  "totalPosts": 150,
  "totalUsers": 45,
  "totalViews": 12580,
  "totalComments": 342
}
```

**Features:**
- Real-time counts from database
- Views aggregated from all posts using MongoDB aggregation
- Comments counted from all post comment arrays
- Efficient aggregation pipelines for performance

#### Get Popular Posts
```http
GET /api/admin/posts/popular
```
Get popular posts sorted by view count for trending analysis.

**Authentication Required:** JWT token with `read_post` privilege

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 10, max: 50)
- `timeframe` (optional): Filter by time period
  - `day` - Posts from last 24 hours
  - `week` - Posts from last 7 days (default)
  - `month` - Posts from last 30 days
  - `year` - Posts from last 365 days
  - `all` - All posts (no time filter)

**Response:**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "title": "Most Popular Post",
      "views": 1250,
      "commentsCount": 45,
      "sharesCount": 0,
      "status": "published",
      "createdAt": "2025-10-15T10:00:00.000Z",
      "author": {
        "_id": "author_id",
        "username": "john_doe"
      }
    }
  ]
}
```

**Sorting:**
- Primary: Views (descending)
- Secondary: Creation date (descending)

**Notes:**
- Includes both published and draft posts
- `sharesCount` currently returns 0 (placeholder for future feature)

### Public Endpoints (Additional Features)

#### Track Post View
```http
POST /api/public/posts/:id/view
```
Increment the view count for a post. Called automatically when users view a post.

**Rate Limited:** Base rate limiter applies (1000 requests per 15 minutes)

**Response:**
```json
{
  "views": 125
}
```

**Features:**
- Atomic increment using MongoDB `$inc` operator
- Only increments for published posts
- Returns 404 for unpublished or non-existent posts
- Prevents race conditions with concurrent requests

**Use Case:**
Frontend automatically calls this endpoint when a user views a blog post, enabling accurate view tracking analytics.

## New Features

### Post Views Tracking
Tracks how many times each post has been viewed by visitors.

**Backend Implementation:**
- `views` field added to Post model (Number, default: 0)
- Database index on `views` field for efficient sorting
- POST `/api/public/posts/:id/view` endpoint for tracking
- Admin stats endpoint aggregates total views
- Popular posts endpoint sorts by view count

**Frontend Integration:**
- BlogPost component automatically tracks views on page load
- Admin dashboard displays total views
- Popular posts widget shows trending content
- View count displayed on each post

**Security:**
- Rate limited to prevent abuse
- Only published posts can be tracked
- Atomic operations prevent race conditions

### Last Login Tracking
Records when users last successfully logged in to the system.

**Backend Implementation:**
- `lastLogin` field added to User model (Date, nullable)
- Updated on successful authentication only
- Not updated on failed login attempts
- Included in user list API responses

**Frontend Integration:**
- User list table displays "Last Login" timestamp
- Shows "Never" for users who haven't logged in yet
- Format: "Oct 16, 2025" or "Never"

**Use Cases:**
- Monitor user activity
- Identify inactive accounts
- Security auditing
- Compliance reporting

**Security:**
- Only updates on successful password validation
- Only visible to admins with `read_user` privilege
- Failed login attempts don't update timestamp
- Prevents attackers from determining valid usernames

## Error Handling
The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Server Error

Error responses include a message:
```json
{
  "message": "Error description"
}
```

## Data Models

### User
```javascript
{
  _id: ObjectId,
  username: String, // XSS protected
  email: String, // Validated email format
  password: String, // Hashed with bcrypt
  role: ObjectId (ref: 'Role'),
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date, // NEW: Tracks last successful login timestamp
  createdAt: Date,
  updatedAt: Date
}
```

### Post
```javascript
{
  _id: ObjectId,
  title: String, // XSS protected
  content: String, // Supports rich HTML with sanitization
  excerpt: String, // Short description
  author: ObjectId (ref: 'User'),
  tags: [String], // Array of tag strings
  views: Number, // NEW: Tracks post view count (default: 0)
  isPublished: Boolean,
  comments: [{
    content: String, // XSS protected
    author: ObjectId (ref: 'User'),
    name: String, // For non-authenticated commenters
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Post Indexes:**
- Text index on `title` and `content` for search functionality
- Index on `tags` for efficient tag filtering
- Index on `views` (descending) for popular posts queries
- Index on `createdAt` (descending) for chronological ordering

### Role
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  description: String, // Supports rich HTML with sanitization
  privileges: [ObjectId] (ref: 'Privilege'),
  createdAt: Date,
  updatedAt: Date
}
```

### Privilege
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  code: String, // XSS protected, unique identifier
  description: String, // Supports rich HTML with sanitization
  createdAt: Date,
  updatedAt: Date
}
```

## Development

### Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Last Login"
```

### Test Suite
The project includes comprehensive test coverage with 185 tests:

**Test Files:**
- `auth.test.js` (18 tests) - Authentication and last login tracking
- `admin.test.js` (21 tests) - Admin dashboard statistics and popular posts
- `users.test.js` (17 tests) - User CRUD operations
- `posts.test.js` (17 tests) - Post management and rich content validation
- `roles.test.js` (20 tests) - Role management and data integrity
- `privileges.test.js` (8 tests) - Privilege management
- `public.test.js` (17 tests) - Public API and view tracking
- `captcha.test.js` (11 tests) - CAPTCHA generation and validation
- `password.test.js` (9 tests) - Password reset functionality
- `change-password.test.js` (7 tests) - Password change validation
- `pagination.test.js` (10 tests) - Pagination across all endpoints
- `search.test.js` (7 tests) - Search and tag filtering
- `trim-inputs.test.js` (5 tests) - Input sanitization
- `password-validator.test.js` (9 tests) - Password validation rules
- `roles.content.test.js` (4 tests) - Rich content in role descriptions
- `privileges.content.test.js` (4 tests) - Rich content in privilege descriptions

**Test Results:** 183 tests passing, 2 skipped

**Key Test Coverage:**
- ✅ Authentication with CAPTCHA validation
- ✅ Last login timestamp tracking (4 tests)
- ✅ Post view tracking (5 tests)
- ✅ Admin statistics aggregation (11 tests)
- ✅ Popular posts with timeframe filtering (10 tests)
- ✅ Role-based access control
- ✅ XSS protection and input validation
- ✅ Rich content sanitization
- ✅ Rate limiting
- ✅ Pagination across all endpoints
- ✅ Search and tag filtering
- ✅ Concurrent operation handling
- ✅ Data integrity and referential integrity

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/blog

# JWT
JWT_SECRET=your_jwt_secret_key

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

### API Testing
You can test the API using tools like:
- **Postman** - Import the endpoints and test interactively
- **cURL** - Command-line HTTP requests
- **Automated Tests** - Jest test suite included

Example cURL requests:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password","testBypassToken":"your_token"}'

# Get admin stats (requires auth token)
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Track post view
curl -X POST http://localhost:5000/api/public/posts/POST_ID/view

# Get popular posts
curl -X GET "http://localhost:5000/api/admin/posts/popular?timeframe=week&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Performance Considerations

### Database Indexes
The application uses strategic indexes for optimal query performance:

**User Model:**
- Email (unique)
- Username (unique)
- lastLogin (descending) - for activity queries

**Post Model:**
- Text index on title and content - for full-text search
- Tags array - for tag filtering
- Views (descending) - for popular posts sorting
- createdAt (descending) - for chronological ordering
- isPublished + createdAt - compound index for public queries

**Role Model:**
- Name (unique)

**Privilege Model:**
- Code (unique)

### Caching Strategies
Consider implementing caching for:
- Popular posts (Redis cache with 5-minute TTL)
- Dashboard statistics (Cache invalidation on post create/delete)
- User roles and privileges (In-memory cache)

### Rate Limiting
- Base rate limiter: 1000 requests per 15 minutes
- Comment rate limiter: 10 comments per hour per IP
- Configurable via environment variables
- Different limits for test vs production environments

## Security Features

### Authentication & Authorization
- JWT-based authentication with 7-day expiration
- CAPTCHA validation on login to prevent brute force attacks
- Role-based access control (RBAC) with granular privileges
- Password hashing with bcrypt (10 salt rounds)
- Test bypass token for E2E testing environments

### Input Validation & Sanitization
- XSS protection on all text inputs
- Rich HTML content sanitization (DOMPurify)
- Email format validation (RFC 5322 compliant)
- Password complexity requirements
- Input length limits
- Trim whitespace from inputs

### Rate Limiting
- IP-based rate limiting on all endpoints
- Special limits for comment posting
- Configurable thresholds
- Prevents abuse and DDoS attacks

### Data Integrity
- Referential integrity checks before deletion
- Cascade deletion for related data
- Atomic operations for view counts
- Transaction-like operations where needed
- Prevents orphaned records

### Security Best Practices
- Environment variables for sensitive data
- Password reset tokens with expiration
- Failed login attempts don't reveal user existence
- lastLogin only updates on successful authentication
- Admin-only endpoints protected by privileges
- CORS configuration for production
- Helmet.js for security headers

## Deployment

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

### Docker Support
The application includes Docker configuration:
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## API Versioning
Current version: v1 (implicit)
Future versions will use URL versioning: `/api/v2/...`

## Documentation
- Backend API: This README
- Detailed Feature Docs:
  - `VIEW_TRACKING_IMPLEMENTATION.md` - Post views tracking feature
  - `LAST_LOGIN_FEATURE.md` - Last login tracking feature
  - `POPULAR_POSTS_WIDGET_FIX.md` - Popular posts widget implementation
  - `ADMIN_STATS_ENDPOINT_FIX.md` - Admin statistics endpoint

## Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## License
MIT License - See LICENSE file for details