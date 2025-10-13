# MyBlog - Secure MERN Stack Blogging Platform

A full-stack blogging platform built with the MERN stack (MongoDB, Express.js, React, Node.js), featuring comprehensive security measures and modern development practices.

## Key Features

### Security
- 🔐 JWT-based authentication
- 🤖 CAPTCHA verification for login/registration
- 🔒 bcrypt password hashing
- 🛡️ Rate limiting on sensitive endpoints
- 🧹 XSS protection and input sanitization
- 👥 Role-based access control (RBAC)

### User Management
- User registration with email verification
- Secure password reset flow
- Profile management
- Role-based permissions

### Blog Features
- Create, edit, and delete blog posts
- Rich text editor support
- Comment system
- Content moderation tools
- Search functionality

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
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication
- **bcrypt**: Password hashing
- **Jest**: Testing framework

### Frontend
- **React**: UI framework
- **Context API**: State management
- **Axios**: HTTP client
- **CSS**: Styling

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
cd backend
npm test
```

## Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5002
- MongoDB Express: http://localhost:8081

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/captcha` - Get CAPTCHA
- `POST /api/auth/logout` - Logout

### User Endpoints
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Post Endpoints
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

## Security Best Practices
- ✅ Secure password storage with bcrypt
- ✅ CAPTCHA protection against bots
- ✅ Rate limiting for API endpoints
- ✅ JWT token validation
- ✅ XSS protection
- ✅ Input validation and sanitization
- ✅ Secure HTTP headers
- ✅ Role-based access control

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.