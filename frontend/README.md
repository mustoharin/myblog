# MyBlog Frontend Application

## 🎨 Overview
A modern, responsive React 18 application providing both a public blogging interface and a comprehensive admin dashboard. Built with Material-UI for professional design and optimized for performance across all devices. Features enterprise-grade security with XSS protection, secure authentication, and comprehensive error handling.

![React](https://img.shields.io/badge/react-18.x-blue.svg)
![Material-UI](https://img.shields.io/badge/Material--UI-7.x-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6%2B-yellow.svg)
![Responsive](https://img.shields.io/badge/responsive-mobile%20first-green.svg)
![Security](https://img.shields.io/badge/security-hardened-brightgreen.svg)

## 🛠️ Tech Stack
- **React 18** - Modern UI framework with concurrent features and hooks
- **Material-UI v7** - Comprehensive component library with theming system
- **React Router v6** - Declarative client-side routing with nested routes
- **Axios** - HTTP client with security timeout (10s) and request/response interceptors
- **React Context API** - Centralized state management for authentication and app state
- **React Hot Toast** - Modern toast notification system with customizable styling
- **Date-fns** - Lightweight date manipulation and formatting library
- **React Hooks** - Custom hooks for reusable logic and state management
- **DOMPurify** - Client-side HTML sanitization for XSS prevention
- **ESLint Security Plugins** - Automated security vulnerability detection in development

## 🌟 Key Features

### 🌐 Public Interface
- **Modern Blog Homepage** with responsive grid layout and infinite scroll
- **Advanced Search & Filtering** with real-time tag-based filtering and full-text search
- **Individual Post View** with view tracking, social sharing, and SEO optimization
- **Unified Comment System** with CAPTCHA protection and real-time updates
- **Professional User Attribution** with proper fullname/username display
- **Responsive Design** optimized for desktop, tablet, and mobile devices
- **Accessibility Features** with WCAG 2.1 compliance and keyboard navigation
- **Performance Optimization** with lazy loading and optimized asset delivery

### 🔐 Admin Dashboard

#### 📊 Analytics Dashboard
- **Real-time System Statistics** with live updates and trend visualization
- **Popular Posts Analytics** with timeframe filtering and engagement metrics
- **User Activity Monitoring** with recent login tracking and active user counts
- **System Health Monitoring** with database statistics and performance metrics
- **Activity Logs** with detailed system event tracking and user behavior analysis
- **Interactive Charts** with responsive design and drill-down capabilities

#### 👥 User Management
- **Comprehensive User CRUD** with advanced search and filtering capabilities
- **Role & Permission Management** with granular privilege assignment
- **Account Status Control** with active/inactive user management
- **Profile Management** with full name support and professional attribution
- **Last Login Tracking** with security auditing and user behavior insights
- **Bulk Operations** for efficient user administration and batch updates

#### 📝 Content Management
- **Rich Text Editor** with HTML sanitization and real-time preview
- **Advanced Post Management** with draft/publish workflow and version control
- **Tag Management System** with real-time post count calculation
- **Content Analytics** with view tracking, engagement metrics, and performance insights
- **Search & Filtering** with advanced query capabilities across all content
- **Bulk Content Operations** for efficient management and organization

#### 💬 Comment Management System
- **Unified Comment Administration** with comprehensive moderation tools
- **Comment Detail Dialogs** with complete author information and metadata
- **Status Management** for pending, approved, rejected, and spam comments
- **Bulk Comment Operations** for efficient moderation workflows
- **Real-time Comment Statistics** with dashboard integration
- **Advanced Filtering** by status, author, content, and date ranges
- **Comment Search** with full-text search across content and author information
- **Enhanced Error Handling** with robust state management and fallback UI

#### 🛡️ Security & Administration
- **Activity Monitoring** with detailed system logs and user behavior tracking
- **Role-based Access Control** with module-organized privilege management
- **Account Settings** with password change and profile management
- **System Configuration** with environment-based settings management
- **Audit Trails** for security compliance and administrative oversight

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running on port 5002

### Development Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (opens on http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests (if configured)
npm test
```

### Environment Configuration
Create a `.env` or `.env.local` file in the frontend directory:
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5002
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=2.1.0

# Optional: Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
```

### First Time Setup
1. **Start Backend**: Ensure backend API is running on port 5002
2. **Install Dependencies**: Run `npm install`
3. **Start Dev Server**: Run `npm start`
4. **Access Application**: Open http://localhost:3000
5. **Login**: Use default admin credentials (see root README)
REACT_APP_VERSION=2.1.0
```

## 🎯 Recent Updates & Improvements

### Version 2.1 (December 2024)

#### Enhanced Security & Quality
- **✅ Production Build Success** - All security enhancements validated in production build
- **✅ Zero Security Warnings** - Clean ESLint security audit with no vulnerabilities
- **✅ XSS Protection Verified** - All HTML content properly sanitized with DOMPurify
- **✅ Secure Token Management** - JWT validation and safe localStorage handling
- **✅ HTTPS Ready** - Environment-based secure communication configuration

#### Comment System Improvements
- **✅ Fixed Empty Comment Dialog** - Resolved state management issues causing empty detail popups
- **✅ Enhanced User Attribution** - "Commenting as" now properly displays username/fullname
- **✅ Improved State Management** - Fixed React state timing issues with proper cleanup
- **✅ Better Error Handling** - Added null checks and optional chaining for robust rendering
- **✅ Optimized Performance** - Reduced redundant API calls in comment dialog rendering

#### Code Quality Enhancements
- **✅ ESLint Compliance** - Fixed all compilation errors and improved code standards
- **✅ Component Optimization** - Improved React component performance and state management
- **✅ Error Boundaries** - Added comprehensive error handling and fallback UI
- **✅ Responsive Design** - Optimized for all device sizes and screen resolutions

### Version 2.0 (October 2024)

#### Frontend Security Hardening
- **✅ DOMPurify Integration** - Client-side HTML sanitization for all user content
- **✅ Object Injection Prevention** - Safe property access with whitelist validation
- **✅ Secure Token Handling** - JWT validation and secure storage patterns
- **✅ Request Timeout** - 10-second timeout preventing resource exhaustion
- **✅ Production Logging** - Secure logging with sensitive data filtering

## 🛡️ Security Features

### Frontend Security Hardening
The frontend has undergone comprehensive SAST (Static Application Security Testing) analysis and hardening:

#### XSS Protection
- **DOMPurify Integration** - All HTML content sanitized before rendering
- **Safe dangerouslySetInnerHTML** - Custom `createSafeHTML()` utility prevents script injection
- **Input Validation** - Client-side validation with sanitization

#### Object Injection Prevention
- **Safe Property Access** - Whitelist-based property access preventing prototype pollution
- **Dynamic Object Validation** - Property name validation with allowed key lists
- **Secure Form Handling** - Field validation preventing injection attacks

#### Authentication Security
- **Secure Token Management** - JWT validation and safe localStorage handling
- **Token Structure Validation** - Basic JWT format verification
- **Automatic Token Cleanup** - Secure logout with complete data clearing

#### Communication Security
- **HTTPS Enforcement** - Environment-based secure URL configuration
- **Request Timeout** - 10-second timeout preventing resource exhaustion
- **Error Handling** - Secure error responses preventing information disclosure

#### Development Security
- **ESLint Security Plugins** - Automated vulnerability detection during development
- **Secure Logging** - Production-safe logging with sensitive data filtering
- **Environment-based Configuration** - Secure defaults for production deployment

### Security Testing Results
- ✅ **Build Success** - Production build passes with security enhancements
- ✅ **XSS Prevention** - All HTML content properly sanitized
- ✅ **Injection Protection** - Object property access secured with validation
- ✅ **Token Security** - JWT handling secured with validation
- ✅ **HTTPS Ready** - Environment-based secure communication configuration

## 🏗️ Architecture

### Component Architecture
```
Frontend Architecture
├── Public Interface
│   ├── BlogList Component - Post browsing with search/filter
│   ├── BlogPost Component - Individual post view with unified comments
│   ├── CommentForm - User-aware commenting with proper attribution
│   ├── CommentsList - Threaded comment display with status filtering
│   └── CommentsSection - Complete comment management interface
├── Admin Dashboard
│   ├── Dashboard - Analytics and system overview with comment stats
│   ├── User Management - CRUD operations with role assignment
│   ├── Post Management - Content creation with rich text editor
│   ├── CommentManagement - Unified comment moderation with detail dialogs
│   ├── Role Management - Permission system administration
│   ├── Tag Management - Content organization and filtering
│   ├── Activity Logs - System monitoring and audit trails
│   └── Account Settings - Profile and password management
└── Shared Components
    ├── Authentication - Login/logout with CAPTCHA and secure storage
    ├── ProtectedRoute - Role-based route protection
    ├── Navigation - Responsive header and sidebar
    ├── Forms - Reusable form components with validation
    └── UI Elements - Common Material-UI customizations
```

### Comment System Components
- **CommentForm**: Handles both authenticated and anonymous commenting with CAPTCHA
- **CommentsList**: Displays threaded comments with proper author attribution
- **CommentsSection**: Manages comment state and integrates form and list components
- **CommentManagement**: Admin component for comment moderation with enhanced dialogs
- **CommentDetailDialog**: Modal view showing complete comment information and metadata

### State Management
- **AuthContext**: Centralized authentication state with user session management
- **Component State**: Local state management with React hooks
- **API Integration**: Axios-based service layer with error handling and interceptors
- **Form State**: Controlled components with validation and error handling

### Routing Structure
```javascript
// Public Routes
/                     // Blog homepage
/post/:id            // Individual blog post with unified comment system
/login               // User authentication

// Protected Admin Routes (requires authentication)
/admin               // Dashboard overview with comment statistics
/admin/posts         // Post management
/admin/users         // User administration
/admin/comments      // Unified comment management and moderation
/admin/roles         // Role & privilege management
/admin/tags          // Tag management
/admin/activities    // System activity logs
/admin/account       // Account settings
```

## 📁 Project Structure

```
frontend/
├── public/                          # Static assets
│   ├── index.html                  # Main HTML template
│   ├── manifest.json               # PWA configuration
│   └── robots.txt                  # SEO configuration
├── src/
│   ├── components/                 # React components
│   │   ├── admin/                 # Admin dashboard components
│   │   │   ├── Dashboard.js       # Main admin dashboard
│   │   │   ├── AdminHeader.js     # Admin navigation header
│   │   │   ├── AdminSidebar.js    # Admin sidebar navigation
│   │   │   ├── UserList.js        # User management table
│   │   │   ├── UserForm.js        # User creation/editing
│   │   │   ├── PostList.js        # Post management interface
│   │   │   ├── PostForm.js        # Rich text post editor
│   │   │   ├── RoleList.js        # Role management
│   │   │   ├── RoleForm.js        # Role creation/editing
│   │   │   ├── TagList.js         # Tag management
│   │   │   ├── ActivityList.js    # System activity logs
│   │   │   └── AdminStats.js      # Dashboard statistics
│   │   ├── common/                # Shared UI components
│   │   │   ├── Header.js          # Public site header
│   │   │   ├── ProtectedRoute.js  # Route authentication
│   │   │   ├── AccountSettings.js # User account management
│   │   │   └── LoadingSpinner.js  # Loading indicators
│   │   └── public/                # Public-facing components
│   │       ├── BlogList.js        # Blog homepage
│   │       ├── BlogPost.js        # Individual post view
│   │       ├── CommentSection.js  # Comment system
│   │       └── Login.js           # Authentication form
│   ├── context/                   # React Context providers
│   │   └── AuthContext.js         # Authentication state management
│   ├── hooks/                     # Custom React hooks
│   │   └── useLogin.js            # Login logic hook
│   ├── services/                  # API service layer
│   │   └── api.js                 # Axios configuration and interceptors
│   ├── utils/                     # Utility functions
│   │   └── export.js              # Data export utilities
│   ├── App.js                     # Main application component
│   ├── index.js                   # React app entry point
│   └── setupTests.js              # Test configuration
│   ├── services/
│   │   └── api.js          # Axios configuration
│   ├── hooks/
│   │   └── useLogin.js
│   ├── utils/
│   │   └── export.js
│   ├── App.js
│   └── index.js
└── package.json
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload when you make edits.
You'll also see any lint errors in the console.

### `npm test`

Launches the test runner in interactive watch mode.
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and filenames include hashes.
Your app is ready to be deployed!

## Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Key Components

### Public Components

#### BlogList
- Displays paginated list of published posts
- Search functionality (title and content)
- Tag-based filtering
- Click to navigate to full post

#### BlogPost
- Full post content with rich HTML rendering
- Author information with **fullName** display
- View count tracking
- Tag chips for navigation
- Comment section
- Social sharing button

#### CommentSection
- CAPTCHA-protected comment submission
- Rate limiting (10 comments/hour per IP)
- Comment list with timestamps
- XSS protection on all inputs

### Admin Components

#### Dashboard
- System overview statistics
- Popular posts widget with 7/30/all-time filters
- **Active Users Widget** - Shows users logged in within last 15 minutes
- **Recent Activity Widget** - System-wide activity feed with post/user/comment tracking
- **System Status Widget** - Real-time server health monitoring
- Quick navigation to management sections

#### UserForm
- Create/Edit user form
- Fields:
  - Username (required, unique)
  - **Full Name** (optional, for author display)
  - Email (required, unique)
  - Password (required for new users)
  - Role selection
  - **Active/Inactive** toggle
- Formik validation
- XSS protection

#### UserList
- Paginated user table
- Displays:
  - Username and **fullName**
  - Email
  - Role with badge
  - **Status** (Active/Inactive badge)
  - Created date
  - **Last Login** with relative time
- Edit and delete actions
- Search and filter capabilities

#### PostForm
- Rich text editor (TinyMCE or similar)
- Title, content, excerpt fields
- Tag input with autocomplete
- Draft/Publish toggle
- Image upload support
- Preview mode

#### PostList
- Paginated post table
- Search by title/content
- Filter by status (published/draft)
- View count display
- Edit and delete actions
- Quick publish/unpublish

#### RoleManager
- Role list with **user count** per role
- Create/Edit role forms
- Privilege assignment (checkboxes)
- Rich content descriptions
- Delete protection for roles with users

#### UserActivity (Active Users Widget)
- Real-time monitoring of active users
- Shows users logged in within last 15 minutes
- Displays fullName or username fallback
- Relative time display (e.g., "5 minutes ago")
- Auto-refreshes every 30 seconds
- Maximum 10 most recently active users
- Empty state message when no activity
- Material-UI Card with list presentation

#### RecentActivity (Recent Activity Widget)
- System-wide activity feed
- Activity types tracked:
  - Post creation (new posts)
  - Post updates (edited posts)
  - User registrations (new users)
  - Comment additions (new comments)
- Displays activity type, user name, and timestamp
- Relative time formatting (e.g., "2 hours ago")
- Auto-refreshes every 60 seconds
- Configurable activity limit
- View details action menu for each activity
- Empty state with informative message
- Color-coded activity type icons

#### SystemStatus (System Status Widget)
- Comprehensive server health monitoring
- **Database Statistics:**
  - Storage used vs total (progress bar)
  - Data size and index size
  - Number of collections (posts, users, comments)
  - Total documents count
- **Memory Monitoring:**
  - Heap memory used vs total (progress bar)
  - RSS (Resident Set Size) memory tracking
  - Percentage calculations
- **Performance Metrics:**
  - Server uptime in human-readable format (e.g., "5d 12h" or "3h 45m")
  - Response time in milliseconds
- Auto-refreshes every 60 seconds
- Byte formatting with proper units (KB, MB, GB)
- Real-time timestamp from server
- Material-UI Grid layout with multiple panels

## Authentication Flow

1. **Login**: User submits username/password with CAPTCHA
2. **Token Storage**: JWT stored in localStorage
3. **API Requests**: Token included in Authorization header
4. **Token Validation**: Interceptor handles 401 responses
5. **Auto Logout**: Invalid/expired tokens trigger logout
6. **Status Check**: Inactive users blocked even with valid token

## New Features

### Full Name Display (October 2025)
Users can now have a professional display name shown as author on blog posts.

**Implementation:**
- Optional `fullName` field in user profile
- Admin form includes fullName input
- User list shows fullName below username
- Blog posts prefer fullName over username
- Fallback: fullName → username → "Anonymous"

**UI Changes:**
- User Form: Added "Full Name (optional)" field
- User List: Shows fullName as secondary text
- Blog Post: Displays author's fullName prominently

### Account Status Management (October 2025)
Administrators can now activate/deactivate user accounts.

**Implementation:**
- Active/Inactive toggle in user form
- Status badge in user list (green/gray)
- Login blocked for inactive users
- Clear error message on login attempt
- All API requests blocked for inactive users

**UI Changes:**
- User Form: Active/Inactive switch
- User List: Status badge column
- Login: Error message for deactivated accounts

### Last Login Tracking (October 2025)
User list now shows when each user last logged in.

**Implementation:**
- Backend tracks successful login timestamps
- Frontend displays relative time (e.g., "2 hours ago")
- Tooltip shows exact date/time
- "Never" shown for users who haven't logged in

**UI Changes:**
- User List: Last Login column with relative time
- Hover tooltip: Shows exact timestamp
- Format: "Just now", "5 mins ago", "2 days ago", or full date

### Post View Tracking (October 2025)
Blog posts now track view counts for analytics.

**Implementation:**
- Automatic view increment on post page load
- Admin dashboard shows total views
- Popular posts widget based on views
- View count displayed on each post

**UI Changes:**
- Blog Post: View count with eye icon
- Dashboard: Total views stat
- Popular Posts Widget: Sorted by views with counts

### Admin Dashboard Monitoring (November 2025)
Three new real-time monitoring widgets enhance the admin dashboard.

#### Active Users Widget
Displays users who have logged in within the last 15 minutes.

**Implementation:**
- API: `GET /api/admin/users/active`
- Component: `UserActivity.js`
- Auto-refresh: Every 30 seconds
- Max users: 10 (most recent first)

**Features:**
- Shows fullName or username
- Relative time display (e.g., "5 minutes ago")
- Empty state: "No active users in the last 15 minutes"
- Material-UI List with user avatars
- Real-time activity monitoring

#### Recent Activity Widget
Tracks recent system activities including posts, users, and comments.

**Implementation:**
- API: `GET /api/admin/activities?limit=10`
- Component: `RecentActivity.js`
- Auto-refresh: Every 60 seconds
- Configurable limit (default 10)

**Features:**
- Activity types: post_create, post_update, user_create, comment_create
- Color-coded activity icons
- User fullName display when available
- Relative timestamps (e.g., "2 hours ago")
- View details action menu
- Empty state with informative message

#### System Status Widget
Comprehensive server health and performance monitoring.

**Implementation:**
- API: `GET /api/admin/system/status`
- Component: `SystemStatus.js`
- Auto-refresh: Every 60 seconds

**Features:**
- **Database Panel:**
  - Storage usage with progress bar
  - Collections count (posts, users, comments)
  - Data and index sizes
  - Total documents count
- **Memory Panel:**
  - Heap memory with progress bar and percentage
  - RSS memory monitoring
  - Byte formatting (KB/MB/GB)
- **Performance Panel:**
  - Server uptime in human-readable format (e.g., "2d 5h" or "3h 30m")
  - Response time in milliseconds
- Real-time server timestamp
- Format helper functions:
  - `formatBytes()` - Converts bytes to readable units
  - `formatUptime()` - Formats seconds to days/hours or hours/minutes

**UI Design:**
- Material-UI Grid layout (3 columns)
- LinearProgress bars for resource usage
- Typography hierarchy for metrics
- Responsive on all screen sizes
- Auto-updating last refresh timestamp

## API Integration

The app communicates with the backend API through Axios with configured interceptors:

**Base Configuration:**
```javascript
axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

**Request Interceptor:**
- Adds JWT token to Authorization header
- Handles authentication state

**Response Interceptor:**
- Handles 401 (auto-logout)
- Handles 403 (permission denied)
- Global error handling

## Responsive Design

The application is fully responsive and works on:
- 📱 Mobile devices (320px and up)
- 📱 Tablets (768px and up)
- 💻 Desktops (1024px and up)
- 🖥️ Large screens (1440px and up)

Material-UI Grid system ensures proper layout on all screen sizes.

## 🎯 Performance Optimizations

### Code Optimization
- **Code Splitting** with React.lazy() for route-based loading
- **Bundle Analysis** with webpack-bundle-analyzer for size optimization
- **Tree Shaking** to eliminate unused code
- **Minification** and compression in production builds

### Runtime Performance
- **React.memo()** for component memoization
- **useMemo() & useCallback()** for expensive computations
- **Virtualization** for large lists in admin interfaces
- **Debounced Search** for real-time filtering without excessive API calls

### Network Optimization
- **Axios Interceptors** for request/response optimization
- **HTTP Caching** with appropriate cache headers
- **Image Optimization** with lazy loading and responsive images
- **API Response Optimization** with selective data loading

## 🧪 Testing Strategy

### Component Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure
- **Unit Tests** for individual components and utilities
- **Integration Tests** for component interaction and data flow
- **Accessibility Tests** with react-testing-library
- **Mock API Tests** with MSW (Mock Service Worker)

## 🔧 Development Guidelines

### Code Style
- **ESLint Configuration** with React best practices
- **Prettier Integration** for consistent formatting
- **Component Naming** with PascalCase convention
- **File Organization** with feature-based structure

### Component Development
```javascript
// Component Template
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState();

  useEffect(() => {
    // Side effects
  }, []);

  return (
    <Box>
      <Typography variant="h4">
        Component Content
      </Typography>
    </Box>
  );
};

export default ComponentName;
```

### State Management Patterns
- **Local State** for component-specific data
- **Context API** for shared application state
- **Custom Hooks** for reusable stateful logic
- **Props Down, Events Up** pattern for component communication

## 🚀 Deployment

### Build Process
```bash
# Create production build
npm run build

# Serve build locally for testing
npm install -g serve
serve -s build
```

### Environment Variables
```bash
# Production configuration
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

### Docker Deployment
```bash
# Build container
docker build -t myblog-frontend .

# Run container
docker run -p 3000:3000 myblog-frontend
```

## 🔒 Security Considerations

### Client-Side Security
- **XSS Protection** with proper input sanitization
- **CSRF Protection** with token validation
- **Secure Storage** of JWT tokens in httpOnly cookies
- **Route Protection** with authentication guards

### Input Validation
- **Client-side Validation** with immediate feedback
- **Server-side Validation** as the primary security layer
- **Sanitization** of user inputs before display
- **File Upload Security** with type and size restrictions

## 📚 Resources & Documentation

### Material-UI Resources
- [Component Library](https://mui.com/components/)
- [Theming Guide](https://mui.com/customization/theming/)
- [Icon Library](https://mui.com/components/material-icons/)

### React Resources
- [React Documentation](https://reactjs.org/docs/)
- [React Router](https://reactrouter.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Development Tools
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) for performance auditing

## 🤝 Contributing

### Getting Started
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper testing
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Workflow
- Follow the existing code style and patterns
- Write tests for new components and features
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Use meaningful commit messages

---

**Built with ❤️ using React 18 and Material-UI**
- Pagination for large data sets
- Debounced search inputs
- Memoized components where appropriate
- Optimized bundle size with tree shaking

## Security Features

- XSS protection on all user inputs
- CAPTCHA on public forms (login, comments)
- JWT token expiration handling
- Inactive user access blocking
- Role-based component rendering
- Secure password input fields

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Serve Static Files

```bash
npm install -g serve
serve -s build
```

### Docker Deployment

The frontend includes a Dockerfile for containerized deployment:

```bash
docker build -t blog-frontend .
docker run -p 3000:80 blog-frontend
```

## Troubleshooting

### API Connection Issues
- Check `REACT_APP_API_URL` in `.env`
- Verify backend server is running
- Check browser console for CORS errors

### Build Failures
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm cache clean --force`
- Check Node version compatibility

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check token expiration
- Verify user account is active in backend

## 📊 Project Statistics

- **React 18** - Latest stable React with concurrent features
- **Material-UI v7** - Modern component library with 100+ components
- **Production Ready** - Security hardened with comprehensive testing
- **Zero Security Vulnerabilities** - Clean security audit results
- **Responsive Design** - Mobile-first approach with breakpoint optimization
- **Backend Integration** - 379 backend tests ensuring API reliability
- **Enterprise Security** - XSS protection, secure auth, input validation

## 📖 Documentation

- **Frontend README**: This file (React app documentation)
- **Backend API**: [../backend/README.md](../backend/README.md) (Complete API reference)
- **Root README**: [../README.md](../README.md) (Project overview)

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Guidelines
1. **Follow React best practices** - Use functional components with hooks
2. **Component Structure** - Keep components small, focused, and reusable
3. **State Management** - Use Context API for global state, local state for components
4. **Error Handling** - Implement proper error boundaries and fallback UI
5. **Security First** - Always sanitize user input and HTML content
6. **Responsive Design** - Test on multiple screen sizes (mobile, tablet, desktop)
7. **Code Quality** - Run ESLint before committing
8. **Type Safety** - Add PropTypes or comments for component props

### Code Style
- Use functional components with React hooks
- Follow Material-UI theming conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep files under 300 lines when possible

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Run `npm run lint` and fix any issues
5. Test on multiple browsers and screen sizes
6. Commit with meaningful messages
7. Push to your fork and submit a PR

## 📄 License

MIT License - See [LICENSE](../LICENSE) file for details

---

<div align="center">

**Built with ❤️ using React 18 and Material-UI**

**[Report Bug](../../issues)** · **[Request Feature](../../issues/new)** · **[View Components](./src/components/)**

Part of the MyBlog MERN Stack Platform

</div>

## Learn More

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

## License

This project is part of the Blog Application system.
