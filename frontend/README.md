# Blog Frontend Application

## Overview
A modern React-based frontend for a blog platform with role-based admin panel and public blog interface.

## Tech Stack
- **React 18** - UI framework
- **Material-UI v7** - Component library
- **React Router v6** - Client-side routing
- **Axios** - HTTP client with interceptors
- **Formik + Yup** - Form handling and validation
- **React Toastify** - Toast notifications
- **date-fns** - Date formatting

## Features

### 🌐 Public Features
- **Blog List Page** with search and tag filtering
- **Blog Post Detail** with view tracking
- **Comment System** with CAPTCHA protection
- **Responsive Design** for all screen sizes
- **Social Sharing** (when supported by browser)
- **Author Display** shows fullName or username

### 🔐 Admin Panel Features

#### Dashboard
- **System Statistics** (total users, posts, roles, views)
- **Popular Posts Widget** (top 5 by views with timeframe filter)
- **Recent Activity** tracking

#### User Management
- Create, read, update, delete users
- **Full Name** support for professional author display
- **Account Status** toggle (Active/Inactive)
- **Last Login** display with relative time
- Password management
- Role assignment

#### Post Management
- Rich text editor for content creation
- Draft and publish workflow
- Tag management
- View count tracking
- Search and filter posts
- Author attribution

#### Role & Privilege Management
- Create and manage custom roles
- Granular privilege assignment
- **User Count** display per role
- Rich content support for descriptions

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── admin/          # Admin panel components
│   │   │   ├── Dashboard.js
│   │   │   ├── UserForm.js
│   │   │   ├── UserList.js
│   │   │   ├── PostForm.js
│   │   │   ├── PostList.js
│   │   │   ├── RoleManager.js
│   │   │   └── ...
│   │   ├── common/         # Shared components
│   │   │   ├── Header.js
│   │   │   └── ProtectedRoute.js
│   │   └── public/         # Public-facing components
│   │       ├── BlogList.js
│   │       ├── BlogPost.js
│   │       └── CommentSection.js
│   ├── context/
│   │   └── AuthContext.js  # Authentication state
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
- Recent activity feed
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

## Performance Optimizations

- Code splitting with React.lazy()
- Image optimization
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
- Verify user account is active

## Contributing

1. Follow React best practices
2. Use functional components with hooks
3. Implement proper error handling
4. Add PropTypes or TypeScript for type checking
5. Write meaningful commit messages
6. Test on multiple screen sizes

## Learn More

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

## License

This project is part of the Blog Application system.
