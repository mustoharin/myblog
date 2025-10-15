# MyBlog - Secure MERN Stack Blogging Platform

A full-stack blogging platform built with the MERN stack (MongoDB, Express.js, React, Node.js), featuring comprehensive security measures and modern development practices.

## Key Features

### Security
- 🔐 JWT-based authentication with 7-day expiration
- 🤖 CAPTCHA verification for login/registration
- 🔒 bcrypt password hashing (10 salt rounds)
- 🛡️ Rate limiting on sensitive endpoints
- 🧹 XSS protection and input sanitization
- 👥 Role-based access control (RBAC) with granular privileges
- 🔑 Password complexity requirements
- 🚫 Brute force protection

### User Management
- User registration with email verification
- Secure password reset flow with time-limited tokens
- Profile management with role assignment
- Last login tracking for user activity monitoring
- Admin dashboard with user statistics
- Role-based permissions with customizable privileges

### Blog Features
- Create, edit, and delete blog posts with rich HTML content
- Rich text editor with DOMPurify sanitization
- Comment system with rate limiting
- Post views tracking for analytics
- Popular posts widget with timeframe filtering (day/week/month/year)
- Content moderation tools
- Search functionality with full-text indexing
- Tag-based filtering and organization
- Draft and published post states
- Admin dashboard with comprehensive statistics

## Project Structure
```
myblog/
├── backend/                 # Node.js + Express backend
│   ├── config/             # Configuration files
│   ├── middleware/         # Custom middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   └── tests/             # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/      # Context providers
│   │   └── pages/        # Page components
├── docker-compose.yml      # Container orchestration
└── README.md              # Documentation
```

## Tech Stack

### Backend
- **Node.js & Express**: Server framework
- **MongoDB**: NoSQL database with strategic indexing
- **Mongoose**: MongoDB ODM with schema validation
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **Jest**: Testing framework (183/185 tests passing)
- **express-rate-limit**: Rate limiting middleware
- **DOMPurify**: HTML sanitization
- **nodemailer**: Email service for password reset

### Frontend
- **React 18**: Modern UI framework
- **Material-UI v7**: Component library
- **React Router v6**: Client-side routing
- **Context API**: State management
- **Axios**: HTTP client with interceptors
- **Recharts**: Data visualization for admin dashboard

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Container orchestration
- **Mongo Express**: Database management UI

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd myblog
   ```

2. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the containers:
   ```bash
   docker compose up --build
   ```

4. Initialize the database:
   ```bash
   cd backend
   npm run init-db
   ```

## Development

### Running Services
- Start all services:
  ```bash
  docker compose up
  ```

- Start backend only:
  ```bash
  cd backend
  npm run dev
  ```

- Start frontend only:
  ```bash
  cd frontend
  npm start
  ```

### Testing
```bash
# Backend tests (185 tests: 183 passing, 2 skipped)
cd backend
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Last Login"
```

### Test Coverage
The backend includes comprehensive test coverage:
- **Authentication** (18 tests) - Login, registration, CAPTCHA, last login tracking
- **Admin Dashboard** (21 tests) - Statistics, popular posts, user management
- **Posts** (17 tests) - CRUD operations, view tracking, rich content
- **Users** (17 tests) - User management, role assignment
- **Public API** (17 tests) - Public post access, view tracking
- **Security** (20+ tests) - Rate limiting, XSS protection, input validation
- **And more...** - Pagination, search, password validation, etc.

**Total: 183 tests passing, 2 skipped**

## Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5002
- MongoDB Express: http://localhost:8081

## API Documentation

Detailed API documentation is available in the backend README. Key endpoint categories:

### Authentication Endpoints
- `POST /api/auth/register` - Register new user with CAPTCHA
- `POST /api/auth/login` - User login (updates lastLogin timestamp)
- `POST /api/auth/captcha` - Get CAPTCHA challenge
- `POST /api/auth/logout` - Logout user

### User Endpoints (Admin)
- `GET /api/users` - List users with lastLogin information
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Post Endpoints
- `GET /api/posts` - List posts with pagination and search
- `POST /api/posts` - Create post (admin)
- `GET /api/posts/:id` - Get post details
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Admin Dashboard Endpoints
- `GET /api/admin/stats` - Get dashboard statistics (posts, users, views, comments)
- `GET /api/admin/posts/popular` - Get popular posts with timeframe filtering
  - Query params: `timeframe` (day/week/month/year), `limit` (max 50)

### Public Endpoints
- `GET /api/public/posts` - Get published posts
- `GET /api/public/posts/:id` - Get published post details
- `POST /api/public/posts/:id/view` - Track post view (atomic increment)
- `POST /api/public/posts/:id/comments` - Add comment (rate limited)

### Password Management
- `POST /api/password/forgot` - Request password reset
- `POST /api/password/reset/:token` - Reset password with token
- `POST /api/password/change` - Change password (authenticated)

### Roles & Privileges (Admin)
- Role management endpoints for RBAC
- Privilege assignment and management
- Custom role creation with granular permissions

For complete API documentation with request/response examples, see [Backend README](./backend/README.md).

## Security Best Practices
- ✅ Secure password storage with bcrypt (10 salt rounds)
- ✅ CAPTCHA protection against bots and brute force attacks
- ✅ Rate limiting for API endpoints (1000 req/15min, configurable)
- ✅ JWT token validation with 7-day expiration
- ✅ XSS protection with DOMPurify HTML sanitization
- ✅ Input validation and sanitization on all endpoints
- ✅ Secure HTTP headers with helmet.js
- ✅ Role-based access control with granular privileges
- ✅ Password complexity requirements (12+ chars, mixed case, numbers, symbols)
- ✅ Failed login attempts don't reveal user existence
- ✅ Last login tracking for security auditing
- ✅ Atomic database operations to prevent race conditions
- ✅ Environment variables for sensitive configuration
- ✅ Password reset tokens with time-based expiration

## Recent Features

### Post Analytics
- **View Tracking**: Automatic view counting for all published posts
- **Popular Posts Widget**: Admin dashboard widget showing trending posts
- **Timeframe Filtering**: Filter popular posts by day, week, month, or year
- **Atomic Operations**: Thread-safe view counting using MongoDB `$inc`

### User Activity
- **Last Login Tracking**: Automatic timestamp recording on successful login
- **Activity Monitoring**: Admin can view user login patterns
- **Security Audit**: Track user access for security purposes
- **Never Logged In Detection**: Distinguish between never logged in vs. inactive users

### Admin Dashboard
- **Real-time Statistics**: Total posts, users, views, and comments
- **Popular Posts**: Sortable list with timeframe filters
- **User Management**: View last login times for all users
- **System Health**: Monitor content engagement and user activity

## Performance Features

### Database Optimization
- Strategic indexes on frequently queried fields
- Text indexes for full-text search on posts
- Compound indexes for complex queries
- Views field indexed for popular posts sorting
- lastLogin indexed for user activity queries

### Caching Recommendations
- Redis caching for popular posts (5-minute TTL)
- Dashboard statistics caching with invalidation
- Role/privilege in-memory caching

## Documentation

- **[Backend API Documentation](./backend/README.md)** - Comprehensive backend API guide
- **[Frontend Documentation](./frontend/README.md)** - React component documentation
- **[Contributing Guide](./CONTRIBUTING.md)** - Development workflow and guidelines
- **Feature Implementation Docs**:
  - `backend/VIEW_TRACKING_IMPLEMENTATION.md` - Post views feature
  - `backend/LAST_LOGIN_FEATURE.md` - Last login tracking
  - `backend/POPULAR_POSTS_WIDGET_FIX.md` - Popular posts widget

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.