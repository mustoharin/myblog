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
  "captchaSessionId": "string",
  "captchaText": "string"
}
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
```env
NODE_ENV=development
PORT=5002
MONGODB_URI=mongodb://admin:password123@localhost:27018/myblog?authSource=admin
JWT_SECRET=your_jwt_secret
```

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

### Example Test Login
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
  - Add comment to post (requires `create_post` privilege)
  - Request body: `{ "content": "string" }`
  - Returns: Updated post with new comment

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
  username: String,
  email: String,
  password: String (hashed),
  role: ObjectId (ref: 'Role')
}
```

### Post
```javascript
{
  _id: ObjectId,
  title: String, // XSS protected
  content: String, // Supports rich HTML with sanitization
  author: ObjectId (ref: 'User'),
  tags: [String], // Array of tag strings
  date: Date,
  comments: [{
    content: String, // XSS protected
    author: ObjectId (ref: 'User'),
    date: Date
  }]
}
```

### Role
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  description: String, // Supports rich HTML with sanitization
  privileges: [ObjectId (ref: 'Privilege')]
}
```

### Privilege
```javascript
{
  _id: ObjectId,
  name: String, // XSS protected
  description: String, // Supports rich HTML with sanitization
  code: String, // XSS protected
  isActive: Boolean
}
  content: String,
  author: ObjectId (ref: 'User'),
  comments: [{
    content: String,
    author: ObjectId (ref: 'User'),
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Role
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  privileges: [ObjectId] (ref: 'Privilege'),
  isActive: Boolean
}
```

### Privilege
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  code: String,
  isActive: Boolean
}
```

## Development
- Install dependencies: `npm install`
- Run development server: `npm run dev`
- Run tests: `npm test`
- Run with watch mode: `npm run test:watch`