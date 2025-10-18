# MyBlog Backend API

## 🚀 Overview
A robust Node.js/Express.js REST API powering a modern blogging platform with enterprise-level security, comprehensive admin capabilities, and scalable architecture. Built with MongoDB for flexible data management and extensive testing coverage.

![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![Express](https://img.shields.io/badge/express-4.x-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-6.x-green.svg)
![Tests](https://img.shields.io/badge/tests-235%2B-green.svg)

## ✨ Key Features

### 🔐 Advanced Security
- **JWT Authentication** with configurable expiration and refresh tokens
- **CAPTCHA Protection** with session-based verification and E2E testing bypass
- **Role-Based Access Control (RBAC)** with module-organized granular privileges
- **Password Security** with bcrypt hashing, complexity validation, and pattern detection
- **Rate Limiting** with IP-based tracking and progressive lockout
- **XSS Protection** with DOMPurify sanitization for rich content
- **Brute Force Protection** with intelligent delay mechanisms

### 👥 User Management System
- **Multi-role Architecture** with customizable privilege assignment
- **Account Status Control** with active/inactive user management
- **Profile Management** with full name display and professional attribution
- **Last Login Tracking** for security auditing and user analytics
- **Password Reset Flow** with secure token-based email verification
- **User Activity Logging** with comprehensive audit trails

### 📝 Content Management
- **Rich Text Support** with HTML sanitization and content validation
- **Tag Management** with real-time post count calculation and filtering
- **Advanced Search** with MongoDB full-text indexing and aggregation
- **View Analytics** with detailed tracking and popular post algorithms
- **Comment System** with CAPTCHA protection and moderation workflows
- **Draft/Publish Workflow** with version control capabilities

### 📊 Admin Dashboard API
- **Real-time Statistics** with aggregated metrics and performance data
- **Activity Monitoring** with detailed system logs and user behavior tracking
- **Popular Posts Analytics** with timeframe-based insights and engagement metrics
- **User Engagement Data** with login patterns and activity analysis
- **System Health Monitoring** with database stats and performance metrics

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
          "author": { 
            "username": "string",
            "fullName": "string"
          },
          "tags": ["string"],
          "views": "number"
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
  - Get a single published post with full details
  - Returns: Post object with comments and populated author
    ```json
    {
      "title": "string",
      "content": "string (HTML)",
      "excerpt": "string",
      "author": {
        "username": "string",
        "fullName": "string"
      },
      "tags": ["string"],
      "views": "number",
      "comments": [
        {
          "content": "string",
          "authorName": "string",
          "createdAt": "date"
        }
      ],
      "createdAt": "date",
      "updatedAt": "date"
    }
    ```

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
  - Query parameters:
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 10, max: 50)
  - Returns: Paginated array of user objects with fullName, isActive, and lastLogin

- **GET /api/users/:id**
  - Get user by ID (requires `read_user` privilege)
  - Returns: User object

- **POST /api/users**
  - Create new user (requires `create_user` privilege)
  - Request body:
    ```json
    {
      "username": "string (required, unique)",
      "fullName": "string (optional)",
      "email": "string (required, unique)",
      "password": "string (required, min 8 chars)",
      "role": "role_id (required)",
      "isActive": "boolean (optional, default: true)"
    }
    ```
  - Returns: Created user object

- **PUT /api/users/:id**
  - Update user (requires `update_user` privilege)
  - Request body: Any of:
    ```json
    {
      "username": "string",
      "fullName": "string",
      "email": "string",
      "password": "string",
      "role": "role_id",
      "isActive": "boolean"
    }
    ```
  - Returns: Updated user object

- **DELETE /api/users/:id**
  - Delete user (requires `delete_user` privilege)
  - Cannot delete the last superadmin
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

#### Get Active Users
```http
GET /api/admin/users/active
```
Get a list of users who have logged in within the last 15 minutes, useful for monitoring real-time user activity.

**Authentication Required:** JWT token with `read_user` privilege

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "username": "john_doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "lastLogin": "2025-11-15T14:30:00.000Z",
      "role": {
        "_id": "role_id",
        "name": "admin"
      }
    }
  ]
}
```

**Features:**
- Returns users logged in within the last 15 minutes
- Maximum 10 users returned
- Sorted by most recent login first (lastLogin descending)
- Only includes active users (isActive: true)
- Populates user role information
- Returns empty array if no active users

**Use Case:**
Admin dashboard widget displays currently active users in real-time, providing visibility into who is using the system.

#### Get Recent Activities
```http
GET /api/admin/activities
```
Get recent system activities including post creation/updates, user registrations, and comments for activity monitoring.

**Authentication Required:** JWT token with `read_post` privilege

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 10, max: 50)

**Response:**
```json
{
  "activities": [
    {
      "_id": "activity_id",
      "type": "post_create",
      "description": "New post created",
      "user": {
        "username": "john_doe",
        "fullName": "John Doe"
      },
      "timestamp": "2025-11-15T14:45:00.000Z",
      "metadata": {
        "postTitle": "My New Blog Post"
      }
    },
    {
      "_id": "activity_id",
      "type": "user_create",
      "description": "New user registered",
      "user": {
        "username": "jane_smith",
        "fullName": "Jane Smith"
      },
      "timestamp": "2025-11-15T14:30:00.000Z"
    },
    {
      "_id": "activity_id",
      "type": "comment_create",
      "description": "New comment added",
      "user": {
        "username": "Unknown",
        "fullName": "Guest User"
      },
      "timestamp": "2025-11-15T14:15:00.000Z",
      "metadata": {
        "postTitle": "Existing Post"
      }
    }
  ]
}
```

**Activity Types:**
- `post_create`: New blog post created
- `post_update`: Existing post modified
- `user_create`: New user registered
- `comment_create`: New comment added to post

**Features:**
- Aggregates activities from multiple sources (posts, users, comments)
- Sorted by timestamp descending (most recent first)
- Handles posts without updatedAt field (treats as new posts)
- Null-safe handling for deleted/missing authors
- Includes relevant metadata (post titles, etc.)
- Configurable result limit

**Use Case:**
Admin dashboard Recent Activity widget displays system-wide activity feed for monitoring user engagement and content creation.

#### Get System Status
```http
GET /api/admin/system/status
```
Get comprehensive system health metrics including database statistics, memory usage, and performance data.

**Authentication Required:** JWT token with `read_post` privilege

**Response:**
```json
{
  "database": {
    "storageSize": 10485760,
    "dataSize": 8388608,
    "indexSize": 2097152,
    "collections": 5,
    "objects": 1250,
    "avgObjSize": 6710
  },
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600,
    "rss": 157286400,
    "external": 2097152
  },
  "performance": {
    "uptime": 86400,
    "responseTime": 42
  },
  "timestamp": "2025-11-15T14:50:00.000Z"
}
```

**Response Fields:**
- `database`:
  - `storageSize`: Total database storage in bytes
  - `dataSize`: Actual data size in bytes
  - `indexSize`: Index size in bytes
  - `collections`: Number of collections
  - `objects`: Total number of documents
  - `avgObjSize`: Average object size in bytes
- `memory`:
  - `heapUsed`: V8 heap memory used in bytes
  - `heapTotal`: V8 total heap size in bytes
  - `rss`: Resident Set Size (total memory) in bytes
  - `external`: Memory used by C++ objects in bytes
- `performance`:
  - `uptime`: Server uptime in seconds
  - `responseTime`: Estimated response time in milliseconds
- `timestamp`: Server time when status was collected

**Features:**
- Real-time database statistics using MongoDB stats()
- Node.js process memory usage metrics
- Server uptime tracking since startup
- Response time measurement
- Atomic operation timing for accuracy

**Use Case:**
Admin dashboard System Status widget provides real-time server health monitoring, helping administrators identify performance issues and resource constraints.

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

### User Full Name Display
Users can now have a full name that is displayed as the author name on public blog posts.

**Backend Implementation:**
- `fullName` field added to User model (String, optional, XSS protected)
- Included in user create and update endpoints
- Public posts API populates author with both `username` and `fullName`
- Falls back to username if fullName is not set

**Frontend Integration:**
- User form includes fullName input field (optional)
- User list displays fullName below username when available
- Blog posts display author's fullName instead of username
- Fallback hierarchy: fullName → username → "Anonymous"

**Use Cases:**
- Professional author attribution on blog posts
- Display real names instead of usernames
- Better user experience for public-facing content
- Maintain username for login while showing friendly names

**Data Migration:**
- No migration required - field is optional
- Existing users work without fullName (shows username)
- Can be added/updated at any time via admin panel

### User Account Status Management
Administrators can activate or deactivate user accounts to control system access.

**Backend Implementation:**
- `isActive` field added to User model (Boolean, default: true)
- Login endpoint blocks inactive users (returns 403)
- Auth middleware validates user status on every protected request
- Included in user create, update, and list endpoints

**Frontend Integration:**
- User form includes Active/Inactive toggle switch
- User list displays status badge (green "Active" / gray "Inactive")
- Admin panel allows toggling user status
- Clear visual indication of account status

**Access Control:**
- Inactive users cannot login (receives "account deactivated" message)
- Inactive users with valid tokens are blocked on all API requests
- Prevents system access without deleting user data
- Preserves user's posts, comments, and history

**Use Cases:**
- Temporarily suspend problematic users
- Deactivate former employees
- Block spam accounts
- Maintain audit trail while preventing access

**Security:**
- Status check on every authenticated request
- Cannot be bypassed with cached tokens
- Clear error message for inactive users
- Only users with `update_user` privilege can change status

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
All models (Post, User, Role, Privilege) use consistent explicit timestamp fields:
- Fields are explicitly defined in schema rather than using `timestamps: true`
- Pre-save middleware automatically updates `updatedAt` on both `save()` and `findOneAndUpdate()` operations
- Provides consistent behavior across all model operations

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
The project includes comprehensive test coverage with 237 tests:

**Test Files:**
- `auth.test.js` (18 tests) - Authentication and last login tracking
- `admin.test.js` (46 tests) - Admin dashboard statistics, popular posts, active users, recent activity, system status
- `users.test.js` (28 tests) - User CRUD operations, fullName, isActive status
- `posts.test.js` (17 tests) - Post management and rich content validation
- `roles.test.js` (20 tests) - Role management and data integrity
- `privileges.test.js` (8 tests) - Privilege management
- `public.test.js` (19 tests) - Public API and view tracking
- `captcha.test.js` (11 tests) - CAPTCHA generation and validation
- `password.test.js` (9 tests) - Password reset functionality
- `change-password.test.js` (7 tests) - Password change validation
- `pagination.test.js` (10 tests) - Pagination across all endpoints
- `search.test.js` (7 tests) - Search and tag filtering
- `trim-inputs.test.js` (5 tests) - Input sanitization
- `password-validator.test.js` (9 tests) - Password validation rules
- `roles.content.test.js` (4 tests) - Rich content in role descriptions
- `privileges.content.test.js` (4 tests) - Rich content in privilege descriptions

**Test Results:** 235 tests passing, 2 skipped

**Key Test Coverage:**
- ✅ Authentication with CAPTCHA validation
- ✅ Last login timestamp tracking (4 tests)
- ✅ Post view tracking (5 tests)
- ✅ Admin statistics aggregation (11 tests)
- ✅ Popular posts with timeframe filtering (10 tests)
- ✅ Active users monitoring (8 tests)
- ✅ Recent activity tracking (9 tests)
- ✅ System status metrics (8 tests)
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

## Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## License
MIT License - See LICENSE file for details