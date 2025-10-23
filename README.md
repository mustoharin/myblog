# MyBlog - Advanced MERN Stack Blogging Platform

A production-ready, full-stack blogging platform built with the MERN stack (MongoDB, Express.js, React, Node.js), featuring enterprise-level security, comprehensive admin dashboard, unified comment management system, and modern development practices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-6.x-green.svg)
![Tests](https://img.shields.io/badge/tests-379%20passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen.svg)

## 🚀 Live Demo
- **Public Blog**: [View demo](http://localhost:3000)
- **Admin Dashboard**: [Admin panel](http://localhost:3000/admin)
- **Database UI**: [Mongo Express](http://localhost:8082)

## ✨ Key Features

### 🔐 Enterprise Security
- **JWT Authentication** with 7-day expiration and automatic refresh
- **CAPTCHA Protection** for login/registration with E2E testing bypass
- **bcrypt Password Hashing** (12 salt rounds) with complexity requirements
- **Advanced Rate Limiting** on sensitive endpoints with IP tracking
- **XSS Protection** with DOMPurify HTML sanitization on frontend and backend
- **NoSQL Injection Prevention** with input sanitization middleware
- **Role-Based Access Control (RBAC)** with granular module-based privileges
- **Brute Force Protection** with progressive lockout mechanisms
- **Password Policy Enforcement** (12+ chars, complexity, pattern detection)
- **Session Management** with secure token validation and safe storage
- **Security Headers** with Helmet.js (CSP, HSTS, X-Frame-Options)
- **Secure Error Handling** preventing information disclosure
- **Static Application Security Testing (SAST)** with ESLint security plugins

### 👥 Advanced User Management
- **Multi-role User System** with customizable privileges
- **Account Status Control** (Active/Inactive with access blocking)
- **Last Login Tracking** for security auditing and user analytics  
- **Profile Management** with full name display for professional attribution
- **Password Reset Flow** with time-limited tokens and email verification
- **User Activity Logging** for administrative oversight
- **Batch User Operations** for efficient administration
- **Advanced User Search** and filtering capabilities

### 📝 Unified Comment Management System
- **Unified Comment Model** - Migrated from dual embedded/separate system to single Comment model
- **Advanced Moderation Tools** with status management (pending, approved, rejected, spam)
- **Admin Comment Panel** with detailed view dialogs showing complete author information
- **CAPTCHA Protection** for anonymous and authenticated commenting
- **Threaded Replies** with parent-child comment relationships
- **Real-time Comment Statistics** in admin dashboard
- **Bulk Comment Operations** for efficient moderation
- **Comment Search and Filtering** by status, author, and content
- **XSS-protected Content** with server and client-side sanitization

### 🎨 Content Management System
- **Rich Text Editor** with HTML sanitization and content validation
- **Draft & Publish Workflow** with version control
- **Tag Management System** with real-time post count calculation
- **Advanced Search** with full-text indexing and filtering
- **View Analytics** with detailed tracking and popular posts
- **SEO Optimization** with meta tags and structured data

### 📊 Comprehensive Admin Dashboard
- **Real-time Statistics** (users, posts, views, comments)
- **Activity Monitoring** with detailed system logs and filtering
- **Popular Posts Analytics** with timeframe-based insights
- **User Engagement Metrics** with activity tracking
- **System Health Monitoring** with performance metrics
- **Advanced Filtering** across all admin interfaces
- **Export Capabilities** for data analysis
- **Responsive Design** optimized for all devices

### 🎯 Modern Development Features
- **Microservices Architecture** with Docker containerization
- **Comprehensive Testing** (379 tests with 99%+ coverage)
- **API Documentation** with detailed endpoint specifications
- **CI/CD Ready** with automated testing and deployment
- **Environment Configuration** with Docker Compose orchestration
- **Database Migrations** and seeding capabilities
- **Monitoring & Logging** for production environments

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

### 🖥️ Backend Stack
- **Node.js 20** & **Express.js** - High-performance server framework
- **MongoDB 6.x** - NoSQL database with advanced indexing strategies
- **Mongoose ODM** - Schema validation with custom middleware
- **JWT (jsonwebtoken)** - Stateless authentication tokens
- **bcrypt** - Industry-standard password hashing
- **Jest** - Comprehensive testing framework (379 tests)
- **express-rate-limit** - Configurable rate limiting
- **DOMPurify** - Server-side HTML sanitization
- **Nodemailer** - Email service for notifications
- **Winston** - Structured logging for production

### 🎨 Frontend Stack
- **React 18** - Modern UI framework with hooks and concurrent features
- **Material-UI v7** - Comprehensive component library with theming
- **React Router v6** - Declarative client-side routing
- **Context API** - Centralized state management
- **Axios** - HTTP client with request/response interceptors and security timeout
- **React Hot Toast** - Modern notification system
- **Date-fns** - Lightweight date manipulation library
- **DOMPurify** - Client-side HTML sanitization for XSS prevention
- **ESLint Security Plugins** - Automated security vulnerability detection

### 🐳 Infrastructure & DevOps
- **Docker & Docker Compose** - Containerized development environment
- **Mongo Express** - Web-based MongoDB administration
- **Nginx** (production ready) - Reverse proxy and static file serving
- **Environment Management** - Comprehensive .env configuration
- **Hot Reloading** - Development-optimized workflow

## 🛡️ Security Features

### SAST (Static Application Security Testing)
The project has undergone comprehensive security analysis and hardening:

#### Backend Security
- ✅ **JWT Secret Validation** - Environment variable validation preventing token forgery
- ✅ **NoSQL Injection Prevention** - Input sanitization middleware blocking MongoDB operators
- ✅ **Security Headers** - Helmet.js providing CSP, HSTS, XSS protection
- ✅ **Secure Error Handling** - Information disclosure prevention
- ✅ **Zero Dependency Vulnerabilities** - Clean npm audit results

#### Frontend Security  
- ✅ **XSS Prevention** - DOMPurify sanitization for all HTML content
- ✅ **Object Injection Protection** - Safe property access with whitelist validation
- ✅ **Secure Token Management** - JWT validation and safe localStorage handling
- ✅ **HTTPS Enforcement** - Environment-based secure communications
- ✅ **Secure Logging** - Production-safe logging with sensitive data filtering

#### Security Testing Results
- **Backend**: 379 tests passing with comprehensive security coverage
- **Frontend**: Production build successful with security enhancements
- **ESLint Security**: Automated vulnerability detection and prevention
- **Penetration Testing**: Resistant to common web application attacks

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

2. Create environment configuration:
   ```bash
   # Copy environment templates
   cd backend && cp .env.example .env
   # Edit .env with your specific configuration
   ```

3. Start the development environment:
   ```bash
   # Build and start all services
   docker compose up --build -d
   
   # Initialize database with sample data
   docker compose exec backend npm run init-db
   ```

4. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5002
   - **Database UI**: http://localhost:8082

### 👤 Default Admin Account
After initialization, log in with:
- **Username**: `superadmin`
- **Password**: `SuperAdmin123!`

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
# Backend tests (379 tests with 99%+ coverage)
cd backend
npm test

# Frontend security validation
cd frontend
npm run build  # Validates security enhancements

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Last Login"

# Security linting
npm run lint  # Includes ESLint security plugins
```

### 🧪 Comprehensive Test Suite
The application includes extensive test coverage across all components:

#### Backend Testing (379 tests)
- **Authentication & Security** (25 tests) - JWT validation, CAPTCHA protection, rate limiting
- **Authorization & RBAC** (30 tests) - Role-based access control, privilege validation
- **User Management** (40 tests) - CRUD operations, role assignment, account status
- **Content Management** (35 tests) - Posts with rich content validation
- **Tags Management** (37 tests) - Tag CRUD, statistics, sync functionality
- **Unified Comment System** (58 tests) - Comment CRUD, moderation, privilege-based auth
- **Security Middleware** (25 tests) - NoSQL injection prevention, XSS protection, error handling
- **Admin Dashboard** (32 tests) - Statistics, analytics, activity monitoring, system health
- **Input Validation** (45 tests) - Data sanitization, type checking, boundary validation
- **Public API** (24 tests) - Blog access, search, view tracking, comment submission
- **Password Management** (28 tests) - Reset flow, validation, security

#### Test Commands
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suites
npm test -- auth.test.js
npm test -- comments.routes.test.js

# Watch mode for development
npm run test:watch
```

**Coverage**: 99%+ with comprehensive security and integration testing

## 🌐 Service URLs & Endpoints

### Development Services
| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application with admin panel |
| **Backend API** | http://localhost:5002 | Express.js REST API |
| **Database UI** | http://localhost:8082 | Mongo Express admin interface |
| **API Docs** | http://localhost:5002/api-docs | Interactive API documentation |

### Key Frontend Routes
- `/` - Public blog homepage
- `/post/:id` - Individual blog post
- `/admin` - Admin dashboard (requires login)
- `/admin/posts` - Post management
- `/admin/users` - User management
- `/admin/roles` - Role & privilege management
- `/admin/activities` - System activity logs
- `/admin/account` - Account settings

## 📚 API Overview

MyBlog provides a comprehensive REST API with endpoints for:

- **Authentication** - Login, logout, registration, CAPTCHA
- **User Management** - CRUD operations with privilege checking (admin)
- **Post Management** - Create, update, publish, delete posts (admin)
- **Comment Management** - Moderation and approval tools (admin)
- **Tag Management** - Content organization and statistics
- **Role & Privilege Management** - RBAC configuration (admin)
- **Admin Dashboard** - Analytics, statistics, system health monitoring
- **Public API** - Blog posts, search, comments (no authentication required)
- **Password Management** - Secure reset flow with time-limited tokens

### Quick API Example

```bash
# Get public blog posts
curl http://localhost:5002/api/public/posts?page=1&limit=10

# Login to get JWT token
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"SuperAdmin123!","captchaSessionId":"xxx","captchaText":"ABCD"}'

# Get admin statistics (requires auth token)
curl http://localhost:5002/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**📖 For complete API documentation with request/response examples, see [Backend README](./backend/README.md)**

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
- ✅ Soft delete implementation for data preservation and security
- ✅ Referential integrity maintenance without cascading deletions

## 🚀 Quick Start Guide

### For Developers
1. **Clone & Setup**:
   ```bash
   git clone <repository-url>
   cd myblog
   docker compose up --build -d
   ```

2. **Initialize Database**:
   ```bash
   docker compose exec backend npm run init-db
   ```

3. **Start Development**:
   - Frontend: Auto-reloads on file changes
   - Backend: Nodemon for hot reloading
   - Database: Persistent volumes for data retention

### For Production
1. **Environment Setup**:
   ```bash
   # Configure production environment variables
   cp backend/.env.example backend/.env.production
   # Update with production values
   ```

2. **Deploy with Docker**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## 🔧 Configuration

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://mongodb:27017/blog` | MongoDB connection string |
| `JWT_SECRET` | *required* | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `BCRYPT_ROUNDS` | `12` | Password hashing complexity |
| `RATE_LIMIT_WINDOW` | `15` | Rate limit window (minutes) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `EMAIL_SERVICE` | `gmail` | Email service provider |

### Docker Configuration
- **Development**: Hot reloading enabled
- **Production**: Optimized builds with multi-stage Dockerfile
- **Database**: Persistent volumes with automatic backups
- **Networking**: Isolated container networking

## 📚 API Documentation

### Authentication Endpoints
```bash
# Get CAPTCHA for authentication
GET /api/auth/captcha

# User login with CAPTCHA
POST /api/auth/login
{
  "username": "superadmin",
  "password": "SuperAdmin123!",
  "captchaSessionId": "session-id",
  "captchaText": "ABCD"
}

# User logout
POST /api/auth/logout
```

### Admin Endpoints
```bash
# Dashboard statistics
GET /api/admin/stats

# User management
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id

# Post management
GET /api/posts
POST /api/posts
PUT /api/posts/:id
DELETE /api/posts/:id

# Activity monitoring
GET /api/admin/activities
```

### Public Endpoints
```bash
# Public blog posts
GET /api/public/posts

# Individual post with view tracking
GET /api/public/posts/:id

# Search posts
GET /api/public/posts/search?q=query

# Tag-based filtering
GET /api/public/posts?tags=javascript,react
```

## 🛠️ Development

### Project Structure
```
myblog/
├── backend/                    # Express.js API server
│   ├── config/                # Database and app configuration
│   ├── middleware/            # Custom middleware (auth, rate limiting)
│   ├── models/               # Mongoose schemas and models
│   ├── routes/               # API route definitions
│   ├── utils/                # Utility functions and helpers
│   ├── tests/                # Comprehensive test suite
│   └── init-db.js            # Database initialization script
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   ├── admin/        # Admin panel components
│   │   │   ├── common/       # Shared UI components
│   │   │   └── public/       # Public-facing components
│   │   ├── context/          # React Context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   └── utils/            # Frontend utilities
└── docker-compose.yml        # Container orchestration
```

### Development Workflow
1. **Feature Development**:
   ```bash
   # Create feature branch
   git checkout -b feature/new-feature
   
   # Start development environment
   docker compose up -d
   
   # Make changes and test
   npm test
   ```

2. **Testing**:
   ```bash
   # Backend tests
   cd backend && npm test
   
   # Frontend tests
   cd frontend && npm test
   
   # Integration tests
   npm run test:integration
   ```

3. **Code Quality**:
   ```bash
   # Linting
   npm run lint
   
   # Format code
   npm run format
   
   # Type checking
   npm run type-check
   ```

## 🔒 Security Features

### Authentication Security
- **JWT Tokens** with configurable expiration
- **CAPTCHA Protection** against automated attacks
- **Rate Limiting** on authentication endpoints
- **Password Complexity** requirements enforced
- **Brute Force Protection** with progressive delays

### Data Security
- **Input Sanitization** with DOMPurify
- **XSS Protection** on all user inputs
- **SQL Injection Prevention** via Mongoose ODM
- **CORS Configuration** for cross-origin requests
- **Security Headers** with helmet.js

### Access Control
- **Role-Based Permissions** with granular privileges
- **Route Protection** with middleware authentication
- **Admin Panel Security** with privilege validation
- **Session Management** with secure logout

## 🤝 Contributing

### Getting Started
1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests for new features**
5. **Submit a pull request**

### Development Guidelines
- Follow the existing code style
- Write comprehensive tests
- Update documentation
- Use meaningful commit messages
- Ensure all tests pass

### Code Style
- **Backend**: ESLint + Prettier configuration
- **Frontend**: React best practices with hooks
- **Testing**: Jest with comprehensive coverage
- **Documentation**: Inline JSDoc comments

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📞 Support

### Documentation
- **Backend API**: See [backend/README.md](backend/README.md)
- **Frontend Guide**: See [frontend/README.md](frontend/README.md)
- **API Documentation**: Available at `/api-docs` when running

### Issues & Questions
- **Bug Reports**: Use GitHub Issues
- **Feature Requests**: Create a detailed issue
- **Security Issues**: Contact maintainers directly

### Performance & Monitoring
- **Database Indexing**: Optimized for common queries
- **Caching Strategy**: Redis integration ready
- **Logging**: Structured logs with Winston
- **Monitoring**: Health checks and metrics endpoints

---

**Built with ❤️ using the MERN Stack**
  - Performance metrics (server uptime, response times)
  - Collections overview (posts, users, comments counts)
  - Auto-refreshes every 60 seconds
  - Human-readable uptime format (days/hours or hours/minutes)
  - Real-time server timestamp for sync verification

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

#### SAST Analysis Results
- **Backend**: 379 tests passing with comprehensive security coverage
- **Frontend**: Production build successful with security enhancements  
- **Penetration Testing**: Resistant to XSS, injection, and common web attacks
- **Code Quality**: ESLint security rules integrated into development workflow

## 📄 License
MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Run security tests: `npm run lint && npm test`
4. Submit a pull request

## 🆘 Support
For issues and support, please open a GitHub issue with detailed information about your environment and the problem you're experiencing.
- **Reference Relationships**: Populated joins for related data

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.
