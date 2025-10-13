# Contributing to MyBlog

## Quick Start Commands

Here are some helpful commands to get you started with development:

```bash
# Clone and install dependencies
git clone <repository-url>
cd myblog

# Start all services with Docker
docker compose up --build

# Backend development
cd backend
npm install
npm run dev

# Frontend development
cd frontend
npm install
npm start

# Run tests
cd backend
npm test

# Database initialization
cd backend
npm run init-db
```

## Development Workflow

### Setting up the Development Environment

1. **Environment Variables**:
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
```

2. **Database Setup**:
```bash
# Start MongoDB container
docker compose up -d mongodb

# Initialize database with sample data
npm run init-db
```

3. **Start Development Servers**:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### Common Development Tasks

#### Backend Development

```bash
# Create new route
touch backend/routes/new-feature.js

# Add new model
touch backend/models/NewModel.js

# Run specific tests
npm test -- tests/specific-test.js
```

#### Frontend Development

```bash
# Create new component
touch frontend/src/components/NewComponent.js

# Add new page
touch frontend/src/pages/NewPage.js
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Project Structure Guide

### Backend Structure
```
backend/
├── config/             # Configuration files
│   ├── db.js          # Database configuration
│   └── auth.js        # Authentication configuration
├── middleware/        # Express middleware
│   ├── auth.js       # JWT authentication
│   └── validation.js # Request validation
├── models/           # Mongoose models
├── routes/           # API routes
├── utils/            # Utility functions
└── tests/           # Test files
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/   # Reusable components
│   ├── context/     # React Context providers
│   ├── hooks/       # Custom hooks
│   ├── pages/       # Page components
│   └── utils/       # Utility functions
└── public/          # Static assets
```

## Code Style Guide

### Backend (Node.js)

- Use ES6+ features
- Async/await for asynchronous operations
- Error handling with try/catch
- Input validation for all routes
- Document API endpoints with comments

Example:
```javascript
// Route handler example
router.post('/posts', auth, async (req, res) => {
  try {
    // Validate input
    const { error } = validatePost(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Create post
    const post = new Post({
      title: req.body.title,
      content: req.body.content,
      author: req.user._id
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Frontend (React)

- Functional components with hooks
- Props validation with PropTypes
- CSS modules for styling
- Context API for state management

Example:
```jsx
import React from 'react';
import PropTypes from 'prop-types';
import styles from './Post.module.css';

const Post = ({ title, content, author }) => {
  return (
    <article className={styles.post}>
      <h2>{title}</h2>
      <p>{content}</p>
      <footer>By {author}</footer>
    </article>
  );
};

Post.propTypes = {
  title: PropTypes.string.required,
  content: PropTypes.string.required,
  author: PropTypes.string.required
};

export default Post;
```

## Git Workflow

1. Create a new branch for each feature/fix
```bash
git checkout -b feature/new-feature
```

2. Make commits with clear messages
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login validation issue"
```

3. Push changes and create PR
```bash
git push origin feature/new-feature
# Create PR through GitHub interface
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
```bash
# Check MongoDB container
docker compose ps
docker compose logs mongodb
```

2. **Node.js Port Conflicts**
```bash
# Find and kill process using port
lsof -i :5002
kill -9 <PID>
```

3. **Build Issues**
```bash
# Clean install dependencies
rm -rf node_modules
npm cache clean --force
npm install
```

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/guide/routing.html)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Docker Documentation](https://docs.docker.com/)