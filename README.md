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
- **Full name display for professional author attribution**
- **Account status management (active/inactive users)**
- Last login tracking for user activity monitoring
- Admin dashboard with user statistics
- Role-based permissions with customizable privileges
- Inactive user access control (blocked login and API access)

### Blog Features
- Create, edit, and delete blog posts with rich HTML content
- Rich text editor with DOMPurify sanitization
- **Author display with full name or username fallback**
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
- **Jest**: Testing framework (205/207 tests passing, 2 skipped)
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
# Backend tests (207 tests: 205 passing, 2 skipped)
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
- **Authentication** (18 tests) - Login, registration, CAPTCHA, last login tracking, inactive users
- **Admin Dashboard** (21 tests) - Statistics, popular posts, user management
- **Posts** (17 tests) - CRUD operations, view tracking, rich content
- **Users** (28 tests) - User management, role assignment, fullName, isActive status
- **Public API** (19 tests) - Public post access, view tracking, author fullName
- **Security** (20+ tests) - Rate limiting, XSS protection, input validation
- **And more...** - Pagination, search, password validation, roles, privileges

**Total: 205 tests passing, 2 skipped**

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
- `GET /api/users` - List users with lastLogin, fullName, and isActive status
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user with fullName and isActive fields
- `PUT /api/users/:id` - Update user (including fullName and status)
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
- `GET /api/public/posts` - Get published posts (includes author fullName)
- `GET /api/public/posts/:id` - Get published post details (includes author fullName)
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
- ✅ Inactive user access control (blocked login and API requests)
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

### User Full Name Display (October 2025)
- **Professional Author Attribution**: Users can have a display name for blog posts
- **Flexible Display**: Shows full name if set, otherwise falls back to username
- **Admin Management**: Create and edit user full names via admin panel
- **Public Integration**: Blog posts display author's full name prominently
- **Backward Compatible**: Optional field, existing users work without changes

### Account Status Management (October 2025)
- **Active/Inactive Toggle**: Administrators can deactivate user accounts
- **Access Control**: Inactive users cannot login to the system
- **Token Validation**: Existing tokens are invalidated for inactive users
- **Audit Trail**: Maintains user data while preventing system access
- **Visual Indicators**: Status badges in admin panel (Active/Inactive)
- **Security**: Only users with `update_user` privilege can change status

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

## Key Technologies & Patterns

### Backend Architecture
- **RESTful API Design**: Clean, intuitive endpoints
- **Middleware Pattern**: Modular authentication, validation, and rate limiting
- **Repository Pattern**: Mongoose models with schema validation
- **Error Handling**: Centralized error handling with meaningful messages
- **Testing**: Comprehensive Jest test suite with 99%+ coverage

### Frontend Architecture
- **Component-Based**: Reusable React components
- **Context API**: Global state management for authentication
- **Protected Routes**: Role-based component rendering
- **Form Validation**: Formik + Yup for robust validation
- **Responsive Design**: Material-UI Grid system for all devices

### Database Design
- **Schema Validation**: Mongoose schemas with XSS protection
- **Strategic Indexing**: Optimized queries for search and sorting
- **Atomic Operations**: Thread-safe counters and updates
- **Reference Relationships**: Populated joins for related data

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.