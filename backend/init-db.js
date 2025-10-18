const mongoose = require('mongoose');
const Role = require('./models/Role');
const Privilege = require('./models/Privilege');
const User = require('./models/User');
const Tag = require('./models/Tag');
require('dotenv').config();

const initializeDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('🗃️  Initializing database...');

    // Define complete list of privileges organized by modules
    const privilegesByModule = {
      authentication: {
        displayName: 'Authentication & Security',
        privileges: [
          {
            name: 'Change Password',
            code: 'change_password',
            description: 'Can change own password and account settings',
            priority: 90
          },
          {
            name: 'Reset Password',
            code: 'reset_password',
            description: 'Can reset passwords for other users',
            priority: 80
          },
          {
            name: 'Manage Sessions',
            code: 'manage_sessions',
            description: 'Can view and terminate user sessions',
            priority: 70
          }
        ]
      },
      
      user_management: {
        displayName: 'User Management',
        privileges: [
          {
            name: 'Create User',
            code: 'create_user',
            description: 'Can create new users and manage user registration',
            priority: 90
          },
          {
            name: 'Read User',
            code: 'read_user',
            description: 'Can view user profiles and user lists',
            priority: 80
          },
          {
            name: 'Update User',
            code: 'update_user',
            description: 'Can update user profiles and settings',
            priority: 70
          },
          {
            name: 'Delete User',
            code: 'delete_user',
            description: 'Can delete users from the system',
            priority: 60
          },
          {
            name: 'Manage User Roles',
            code: 'manage_user_roles',
            description: 'Can assign and modify user roles',
            priority: 50
          }
        ]
      },
      
      role_management: {
        displayName: 'Role & Privilege Management',
        privileges: [
          {
            name: 'Manage Roles',
            code: 'manage_roles',
            description: 'Can create, update, and delete roles and privileges',
            priority: 100
          },
          {
            name: 'View Privileges',
            code: 'view_privileges',
            description: 'Can view all available privileges and their assignments',
            priority: 90
          },
          {
            name: 'Assign Privileges',
            code: 'assign_privileges',
            description: 'Can assign privileges to roles',
            priority: 80
          }
        ]
      },
      
      content_management: {
        displayName: 'Content Management',
        privileges: [
          {
            name: 'Create Post',
            code: 'create_post',
            description: 'Can create new blog posts and drafts',
            priority: 90
          },
          {
            name: 'Read Post',
            code: 'read_post',
            description: 'Can view all posts including drafts and admin content',
            priority: 80
          },
          {
            name: 'Update Post',
            code: 'update_post',
            description: 'Can edit and modify existing blog posts',
            priority: 70
          },
          {
            name: 'Delete Post',
            code: 'delete_post',
            description: 'Can delete blog posts permanently',
            priority: 60
          },
          {
            name: 'Publish Post',
            code: 'publish_post',
            description: 'Can publish and unpublish blog posts',
            priority: 50
          },
          {
            name: 'Manage Tags',
            code: 'manage_tags',
            description: 'Can create, edit, and delete post tags and categories',
            priority: 40
          },
          {
            name: 'Manage Media',
            code: 'manage_media',
            description: 'Can upload, organize, and delete media files',
            priority: 30
          }
        ]
      },
      
      comment_management: {
        displayName: 'Comment Management',
        privileges: [
          {
            name: 'Manage Comments',
            code: 'manage_comments',
            description: 'Can moderate, approve, and delete user comments',
            priority: 90
          },
          {
            name: 'Reply Comments',
            code: 'reply_comments',
            description: 'Can reply to user comments as admin',
            priority: 80
          },
          {
            name: 'Bulk Comment Actions',
            code: 'bulk_comment_actions',
            description: 'Can perform bulk operations on comments',
            priority: 70
          }
        ]
      },
      
      system_administration: {
        displayName: 'System Administration',
        privileges: [
          {
            name: 'View Activities',
            code: 'view_activities',
            description: 'Can view system activity logs and audit trails',
            priority: 90
          },
          {
            name: 'System Settings',
            code: 'system_settings',
            description: 'Can modify system-wide settings and configurations',
            priority: 80
          },
          {
            name: 'View Analytics',
            code: 'view_analytics',
            description: 'Can access website analytics and reports',
            priority: 70
          },
          {
            name: 'Manage Backups',
            code: 'manage_backups',
            description: 'Can create and restore system backups',
            priority: 60
          },
          {
            name: 'System Maintenance',
            code: 'system_maintenance',
            description: 'Can perform system maintenance tasks',
            priority: 50
          }
        ]
      }
    };

    // Flatten privileges with module information
    const allPrivileges = [];
    Object.entries(privilegesByModule).forEach(([moduleCode, moduleInfo]) => {
      moduleInfo.privileges.forEach(privilege => {
        allPrivileges.push({
          ...privilege,
          module: moduleCode,
          moduleDisplayName: moduleInfo.displayName
        });
      });
    });

    // Create privileges
    console.log('🔐 Creating privileges...');
    const createdPrivileges = await Promise.all(
      allPrivileges.map(async (priv) => {
        const existingPriv = await Privilege.findOne({ code: priv.code });
        if (!existingPriv) {
          console.log(`   ✅ Created privilege: ${priv.name} (${priv.code}) in ${priv.moduleDisplayName}`);
          return await Privilege.create(priv);
        } else {
          // Update existing privilege with module information if missing
          if (!existingPriv.module || !existingPriv.moduleDisplayName) {
            existingPriv.module = priv.module;
            existingPriv.moduleDisplayName = priv.moduleDisplayName;
            existingPriv.priority = priv.priority || 0;
            await existingPriv.save();
            console.log(`   🔄 Updated privilege: ${priv.name} (${priv.code}) with module info`);
          } else {
            console.log(`   ⏭️  Privilege exists: ${priv.name} (${priv.code}) in ${priv.moduleDisplayName}`);
          }
          return existingPriv;
        }
      })
    );

    // Create comprehensive roles
    console.log('🎭 Creating roles...');
    
    // Superadmin role with all privileges
    const superadminRole = await Role.findOne({ name: 'superadmin' });
    if (!superadminRole) {
      await Role.create({
        name: 'superadmin',
        description: 'Super Administrator with complete system access and all privileges',
        privileges: createdPrivileges.map(p => p._id)
      });
      console.log('   ✅ Created superadmin role with all privileges');
    } else {
      console.log('   ⏭️  Superadmin role exists');
    }

    // Admin role with content management privileges
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      const adminPrivileges = createdPrivileges.filter(p => 
        ['create_post', 'read_post', 'update_post', 'delete_post', 'publish_post', 'manage_tags', 'manage_comments', 'view_activities', 'change_password', 'manage_media'].includes(p.code)
      );
      await Role.create({
        name: 'admin',
        description: 'Administrator with content management and moderation access',
        privileges: adminPrivileges.map(p => p._id)
      });
      console.log('   ✅ Created admin role with content management privileges');
    } else {
      console.log('   ⏭️  Admin role exists');
    }

    // Editor role with post management
    const editorRole = await Role.findOne({ name: 'editor' });
    if (!editorRole) {
      const editorPrivileges = createdPrivileges.filter(p => 
        ['create_post', 'read_post', 'update_post', 'publish_post', 'manage_tags', 'manage_media', 'change_password'].includes(p.code)
      );
      await Role.create({
        name: 'editor',
        description: 'Content Editor with post creation and editing privileges',
        privileges: editorPrivileges.map(p => p._id)
      });
      console.log('   ✅ Created editor role with post management privileges');
    } else {
      console.log('   ⏭️  Editor role exists');
    }

    // Author role with limited post privileges
    const authorRole = await Role.findOne({ name: 'author' });
    if (!authorRole) {
      const authorPrivileges = createdPrivileges.filter(p => 
        ['create_post', 'read_post', 'change_password'].includes(p.code)
      );
      await Role.create({
        name: 'author',
        description: 'Content Author with post creation privileges',
        privileges: authorPrivileges.map(p => p._id)
      });
      console.log('   ✅ Created author role with basic post privileges');
    } else {
      console.log('   ⏭️  Author role exists');
    }

    // Regular user role
    const regularRole = await Role.findOne({ name: 'regular' });
    if (!regularRole) {
      const regularPrivileges = createdPrivileges.filter(p => 
        ['read_post', 'change_password'].includes(p.code)
      );
      await Role.create({
        name: 'regular',
        description: 'Regular User with basic reading privileges',
        privileges: regularPrivileges.map(p => p._id)
      });
      console.log('   ✅ Created regular user role with basic privileges');
    } else {
      console.log('   ⏭️  Regular role exists');
    }

    // Create initial superadmin user
    console.log('👤 Creating initial users...');
    let superadminUser = await User.findOne({ username: 'superadmin' });
    if (!superadminUser) {
      const superadminRoleDoc = await Role.findOne({ name: 'superadmin' });
      superadminUser = new User({
        username: 'superadmin',
        email: 'superadmin@myblog.com',
        fullName: 'Super Administrator',
        password: 'SuperAdmin2025!@#', // Will be hashed by pre-save middleware
        role: superadminRoleDoc._id,
        isActive: true
      });
      
      await superadminUser.save();
      
      console.log('   ✅ Superadmin user created with credentials:');
      console.log('   📧 Email: superadmin@myblog.com');
      console.log('   👤 Username: superadmin');
      console.log('   🔑 Password: SuperAdmin2025!@#');
    } else {
      console.log('   ⏭️  Superadmin user already exists');
    }

    // Create additional admin user for backwards compatibility
    let adminUser = await User.findOne({ username: 'admin_myblog' });
    if (!adminUser) {
      const adminRoleDoc = await Role.findOne({ name: 'admin' });
      adminUser = new User({
        username: 'admin_myblog',
        email: 'admin@myblog.com',
        fullName: 'Blog Administrator',
        password: 'MyBl0g@dm1n2025!', // Will be hashed by pre-save middleware
        role: adminRoleDoc._id,
        isActive: true
      });
      
      await adminUser.save();
      
      console.log('   ✅ Admin user created with credentials:');
      console.log('   📧 Email: admin@myblog.com');
      console.log('   👤 Username: admin_myblog');
      console.log('   🔑 Password: MyBl0g@dm1n2025!');
    } else {
      console.log('   ⏭️  Admin user already exists');
    }

    // Create sample tags first
    console.log('🏷️  Creating sample tags...');
    const sampleTags = [
      { name: 'javascript', displayName: 'JavaScript', description: 'JavaScript programming language', color: '#f7df1e' },
      { name: 'nodejs', displayName: 'Node.js', description: 'Server-side JavaScript runtime', color: '#68a063' },
      { name: 'react', displayName: 'React', description: 'JavaScript library for building user interfaces', color: '#61dafb' },
      { name: 'mongodb', displayName: 'MongoDB', description: 'NoSQL document database', color: '#4db33d' },
      { name: 'express', displayName: 'Express.js', description: 'Fast, unopinionated web framework for Node.js', color: '#000000' },
      { name: 'frontend', displayName: 'Frontend', description: 'Client-side web development', color: '#ff6b6b' },
      { name: 'backend', displayName: 'Backend', description: 'Server-side development', color: '#4ecdc4' },
      { name: 'database', displayName: 'Database', description: 'Data storage and management', color: '#45b7d1' },
      { name: 'tutorial', displayName: 'Tutorial', description: 'Step-by-step learning guides', color: '#96ceb4' },
      { name: 'tips', displayName: 'Tips & Tricks', description: 'Helpful tips and best practices', color: '#feca57' },
      { name: 'technology', displayName: 'Technology', description: 'Latest in tech trends and innovations', color: '#6c5ce7' },
      { name: 'web-development', displayName: 'Web Development', description: 'Building applications for the web', color: '#fd79a8' },
      { name: 'api', displayName: 'API', description: 'Application Programming Interfaces', color: '#00b894' },
      { name: 'security', displayName: 'Security', description: 'Web security and best practices', color: '#e17055' },
      { name: 'performance', displayName: 'Performance', description: 'Optimization and performance tuning', color: '#a29bfe' }
    ];

    for (const tagData of sampleTags) {
      const existingTag = await Tag.findOne({ name: tagData.name });
      if (!existingTag) {
        await Tag.create(tagData);
        console.log(`   ✅ Created tag: ${tagData.displayName}`);
      } else {
        console.log(`   ⏭️  Tag exists: ${tagData.displayName}`);
      }
    }

    // Create comprehensive sample blog posts
    console.log('📝 Creating sample blog posts...');
    const Post = require('./models/Post');
    
    // Use superadmin as the primary author
    const authorUser = superadminUser || adminUser;
    
    const samplePosts = [
      {
        title: 'Welcome to My Tech Blog',
        content: `
          <h1>Welcome to My Tech Blog! 🎉</h1>
          
          <p>Hello and welcome to our comprehensive technology blog! I'm excited to share this journey with you as we explore the fascinating world of software development, emerging technologies, and digital innovation.</p>
          
          <h2>What You'll Find Here</h2>
          <p>This blog is designed to be your go-to resource for:</p>
          <ul>
            <li><strong>In-depth tutorials</strong> on modern web technologies</li>
            <li><strong>Best practices</strong> and coding standards</li>
            <li><strong>Technology reviews</strong> and comparisons</li>
            <li><strong>Industry insights</strong> and trends</li>
            <li><strong>Project showcases</strong> and case studies</li>
          </ul>
          
          <h2>Our Focus Areas</h2>
          <p>We'll be covering a wide range of topics including:</p>
          <ul>
            <li>JavaScript and Node.js development</li>
            <li>React and modern frontend frameworks</li>
            <li>Database design and management</li>
            <li>API development and integration</li>
            <li>DevOps and deployment strategies</li>
            <li>Security best practices</li>
          </ul>
          
          <p>Whether you're a beginner just starting your coding journey or an experienced developer looking to stay updated with the latest trends, you'll find valuable content here.</p>
          
          <p>Let's embark on this exciting journey together! 🚀</p>
        `,
        excerpt: 'Welcome to our comprehensive technology blog! Join us as we explore modern web development, emerging technologies, and digital innovation together.',
        author: authorUser._id,
        isPublished: true,
        featured: true,
        tags: ['welcome', 'technology', 'web-development']
      },
      
      {
        title: 'Getting Started with Node.js: A Complete Guide',
        content: `
          <h1>Getting Started with Node.js: A Complete Guide</h1>
          
          <p>Node.js has revolutionized server-side development by bringing JavaScript to the backend. In this comprehensive guide, we'll explore everything you need to know to get started with Node.js development.</p>
          
          <h2>What is Node.js?</h2>
          <p>Node.js is a powerful JavaScript runtime built on Chrome's V8 JavaScript engine. It allows developers to use JavaScript for server-side scripting, enabling the creation of scalable network applications.</p>
          
          <h3>Key Features of Node.js</h3>
          <ul>
            <li><strong>Event-driven architecture:</strong> Non-blocking I/O operations</li>
            <li><strong>Single-threaded:</strong> Uses an event loop for concurrency</li>
            <li><strong>Cross-platform:</strong> Runs on Windows, macOS, and Linux</li>
            <li><strong>NPM ecosystem:</strong> Access to millions of packages</li>
          </ul>
          
          <h2>Installation and Setup</h2>
          <p>To get started with Node.js:</p>
          <ol>
            <li>Download Node.js from the official website</li>
            <li>Install using the package manager of your choice</li>
            <li>Verify installation with <code>node --version</code></li>
            <li>Start building amazing applications!</li>
          </ol>
          
          <h2>Your First Node.js Application</h2>
          <p>Let's create a simple HTTP server:</p>
          <pre><code>
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, Node.js World!');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
          </code></pre>
          
          <p>This creates a basic HTTP server that responds with "Hello, Node.js World!" on port 3000.</p>
          
          <h2>Next Steps</h2>
          <p>Now that you have Node.js set up, you can explore:</p>
          <ul>
            <li>Express.js for web application frameworks</li>
            <li>Database integration with MongoDB or PostgreSQL</li>
            <li>RESTful API development</li>
            <li>Real-time applications with Socket.io</li>
          </ul>
          
          <p>Happy coding! 🎯</p>
        `,
        excerpt: 'Learn Node.js from scratch with this comprehensive guide covering installation, core concepts, and building your first application.',
        author: authorUser._id,
        isPublished: true,
        featured: true,
        tags: ['nodejs', 'javascript', 'backend', 'tutorial']
      },
      
      {
        title: 'Building Modern User Interfaces with React',
        content: `
          <h1>Building Modern User Interfaces with React</h1>
          
          <p>React has become the de facto standard for building user interfaces in modern web development. Let's dive deep into what makes React so powerful and how you can leverage it to create amazing applications.</p>
          
          <h2>Why Choose React?</h2>
          <p>React offers several advantages that make it an excellent choice for UI development:</p>
          
          <h3>Component-Based Architecture</h3>
          <p>React applications are built using reusable components, making code more modular and maintainable. Each component manages its own state and can be composed to build complex UIs.</p>
          
          <h3>Virtual DOM</h3>
          <p>React uses a virtual DOM to optimize rendering performance. Changes are first made to the virtual DOM, then efficiently applied to the real DOM, resulting in faster updates.</p>
          
          <h3>Unidirectional Data Flow</h3>
          <p>Data flows in one direction in React applications, making it easier to understand and debug your application's state changes.</p>
          
          <h2>Core React Concepts</h2>
          
          <h3>JSX Syntax</h3>
          <p>JSX allows you to write HTML-like syntax in your JavaScript code:</p>
          <pre><code>
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
          </code></pre>
          
          <h3>State Management</h3>
          <p>React provides several ways to manage state:</p>
          <ul>
            <li><code>useState</code> hook for local component state</li>
            <li><code>useReducer</code> for complex state logic</li>
            <li>Context API for global state management</li>
            <li>Third-party libraries like Redux or Zustand</li>
          </ul>
          
          <h3>Effect Hook</h3>
          <p>The <code>useEffect</code> hook lets you perform side effects in function components:</p>
          <pre><code>
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(response => response.json())
      .then(setUser);
  }, [userId]);
  
  if (!user) return <div>Loading...</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
          </code></pre>
          
          <h2>Best Practices</h2>
          <ul>
            <li>Keep components small and focused</li>
            <li>Use functional components with hooks</li>
            <li>Implement proper error boundaries</li>
            <li>Optimize performance with React.memo and useMemo</li>
            <li>Write comprehensive tests for your components</li>
          </ul>
          
          <p>React continues to evolve with new features like Concurrent Mode and Suspense, making it an exciting technology to work with!</p>
        `,
        excerpt: 'Discover the power of React for building modern, interactive user interfaces. Learn core concepts, best practices, and advanced techniques.',
        author: authorUser._id,
        isPublished: true,
        tags: ['react', 'javascript', 'frontend', 'tutorial']
      },
      
      {
        title: 'MongoDB Essentials: Working with NoSQL Databases',
        content: `
          <h1>MongoDB Essentials: Working with NoSQL Databases</h1>
          
          <p>MongoDB has transformed how we think about databases by providing a flexible, document-oriented approach to data storage. Let's explore why MongoDB is an excellent choice for modern applications.</p>
          
          <h2>What Makes MongoDB Special?</h2>
          
          <h3>Document-Oriented Storage</h3>
          <p>Unlike traditional relational databases, MongoDB stores data in flexible, JSON-like documents called BSON (Binary JSON). This allows for:</p>
          <ul>
            <li>Dynamic schemas that can evolve with your application</li>
            <li>Natural mapping to objects in programming languages</li>
            <li>Embedded documents and arrays for complex data structures</li>
          </ul>
          
          <h3>Horizontal Scalability</h3>
          <p>MongoDB is designed to scale horizontally across multiple servers, making it ideal for applications that need to handle large amounts of data or high traffic loads.</p>
          
          <h2>Working with MongoDB</h2>
          
          <h3>Basic CRUD Operations</h3>
          <p>MongoDB provides intuitive methods for data manipulation:</p>
          
          <h4>Creating Documents</h4>
          <pre><code>
// Insert a single document
db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  hobbies: ["reading", "coding", "hiking"]
});

// Insert multiple documents
db.users.insertMany([
  { name: "Alice", email: "alice@example.com", age: 25 },
  { name: "Bob", email: "bob@example.com", age: 35 }
]);
          </code></pre>
          
          <h4>Reading Documents</h4>
          <pre><code>
// Find all users
db.users.find();

// Find users with specific criteria
db.users.find({ age: { $gte: 30 } });

// Find with projection
db.users.find({}, { name: 1, email: 1, _id: 0 });
          </code></pre>
          
          <h4>Updating Documents</h4>
          <pre><code>
// Update a single document
db.users.updateOne(
  { email: "john@example.com" },
  { $set: { age: 31 } }
);

// Update multiple documents
db.users.updateMany(
  { age: { $lt: 30 } },
  { $inc: { age: 1 } }
);
          </code></pre>
          
          <h4>Deleting Documents</h4>
          <pre><code>
// Delete a single document
db.users.deleteOne({ email: "john@example.com" });

// Delete multiple documents
db.users.deleteMany({ age: { $lt: 18 } });
          </code></pre>
          
          <h2>Advanced Features</h2>
          
          <h3>Aggregation Pipeline</h3>
          <p>MongoDB's aggregation framework provides powerful data processing capabilities:</p>
          <pre><code>
db.users.aggregate([
  { $match: { age: { $gte: 18 } } },
  { $group: { _id: "$department", averageAge: { $avg: "$age" } } },
  { $sort: { averageAge: -1 } }
]);
          </code></pre>
          
          <h3>Indexing for Performance</h3>
          <p>Proper indexing is crucial for query performance:</p>
          <pre><code>
// Create an index on email field
db.users.createIndex({ email: 1 });

// Create a compound index
db.users.createIndex({ age: 1, department: 1 });

// Create a text index for full-text search
db.posts.createIndex({ title: "text", content: "text" });
          </code></pre>
          
          <h2>Using MongoDB with Node.js</h2>
          <p>Mongoose is the most popular ODM (Object Document Mapper) for MongoDB and Node.js:</p>
          <pre><code>
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Create a new user
const newUser = new User({
  name: 'Jane Smith',
  email: 'jane@example.com',
  age: 28
});

await newUser.save();
          </code></pre>
          
          <p>MongoDB's flexibility and powerful features make it an excellent choice for modern web applications. Whether you're building a simple blog or a complex enterprise application, MongoDB can adapt to your needs!</p>
        `,
        excerpt: 'Master MongoDB fundamentals including document storage, CRUD operations, aggregation, and integration with Node.js using Mongoose.',
        author: authorUser._id,
        isPublished: true,
        tags: ['mongodb', 'database', 'nodejs', 'tutorial']
      },
      
      {
        title: 'Building RESTful APIs with Express.js',
        content: `
          <h1>Building RESTful APIs with Express.js</h1>
          
          <p>Express.js is the most popular web framework for Node.js, providing a robust set of features for building web applications and APIs. Let's explore how to create professional RESTful APIs using Express.</p>
          
          <h2>What is REST?</h2>
          <p>REST (Representational State Transfer) is an architectural style for building web services. RESTful APIs follow specific principles:</p>
          <ul>
            <li><strong>Stateless:</strong> Each request contains all necessary information</li>
            <li><strong>Client-Server:</strong> Clear separation of concerns</li>
            <li><strong>Cacheable:</strong> Responses can be cached to improve performance</li>
            <li><strong>Uniform Interface:</strong> Consistent API design patterns</li>
          </ul>
          
          <h2>Setting Up Express.js</h2>
          <p>Let's start by creating a new Express application:</p>
          <pre><code>
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
          </code></pre>
          
          <h2>HTTP Methods and Routes</h2>
          <p>RESTful APIs use different HTTP methods for different operations:</p>
          
          <h3>GET - Retrieve Data</h3>
          <pre><code>
// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific user
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
          </code></pre>
          
          <h3>POST - Create Data</h3>
          <pre><code>
app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
          </code></pre>
          
          <h3>PUT - Update Data</h3>
          <pre><code>
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
          </code></pre>
          
          <h3>DELETE - Remove Data</h3>
          <pre><code>
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
          </code></pre>
          
          <h2>Middleware in Express</h2>
          <p>Middleware functions are the backbone of Express applications:</p>
          
          <h3>Authentication Middleware</h3>
          <pre><code>
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Protected route
app.get('/api/profile', authenticateToken, async (req, res) => {
  // Access req.user here
  res.json({ user: req.user });
});
          </code></pre>
          
          <h3>Error Handling Middleware</h3>
          <pre><code>
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error'
  });
};

app.use(errorHandler);
          </code></pre>
          
          <h2>API Versioning and Documentation</h2>
          <p>For production APIs, consider:</p>
          <ul>
            <li><strong>Versioning:</strong> Use URL versioning (/api/v1/) or header versioning</li>
            <li><strong>Documentation:</strong> Tools like Swagger/OpenAPI for automatic documentation</li>
            <li><strong>Rate Limiting:</strong> Prevent abuse with rate limiting middleware</li>
            <li><strong>CORS:</strong> Configure Cross-Origin Resource Sharing properly</li>
          </ul>
          
          <p>Express.js provides an excellent foundation for building scalable, maintainable APIs. Combined with proper architecture and testing, you can create APIs that stand the test of time!</p>
        `,
        excerpt: 'Learn to build professional RESTful APIs with Express.js, covering routing, middleware, authentication, error handling, and best practices.',
        author: authorUser._id,
        isPublished: true,
        tags: ['express', 'nodejs', 'api', 'backend', 'tutorial']
      },
      
      {
        title: 'Web Security Best Practices for 2025',
        content: `
          <h1>Web Security Best Practices for 2025</h1>
          
          <p>As web applications become more sophisticated, security threats continue to evolve. Staying ahead of these threats requires understanding current best practices and implementing comprehensive security measures.</p>
          
          <h2>The Current Security Landscape</h2>
          <p>In 2025, the most common web application vulnerabilities include:</p>
          <ul>
            <li>Injection attacks (SQL, NoSQL, Command)</li>
            <li>Cross-Site Scripting (XSS)</li>
            <li>Cross-Site Request Forgery (CSRF)</li>
            <li>Insecure authentication and session management</li>
            <li>Security misconfigurations</li>
            <li>Vulnerable dependencies</li>
          </ul>
          
          <h2>Authentication and Authorization</h2>
          
          <h3>Implement Strong Password Policies</h3>
          <ul>
            <li>Minimum 12 characters with complexity requirements</li>
            <li>Password hashing with bcrypt or Argon2</li>
            <li>Account lockout mechanisms</li>
            <li>Password breach detection</li>
          </ul>
          
          <h3>Multi-Factor Authentication (MFA)</h3>
          <p>Implement MFA for all sensitive accounts:</p>
          <pre><code>
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate secret for user
const secret = speakeasy.generateSecret({
  name: user.email,
  service: 'MyApp'
});

// Generate QR code for setup
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.mfaSecret,
  encoding: 'base32',
  token: userToken,
  window: 2
});
          </code></pre>
          
          <h3>JWT Security</h3>
          <p>When using JSON Web Tokens:</p>
          <ul>
            <li>Use strong, random secrets for signing</li>
            <li>Implement token rotation and short expiration times</li>
            <li>Store tokens securely (httpOnly cookies for web apps)</li>
            <li>Validate all claims, especially audience and issuer</li>
          </ul>
          
          <h2>Input Validation and Sanitization</h2>
          
          <h3>Prevent Injection Attacks</h3>
          <pre><code>
const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize');

// Input validation middleware
const validateInput = (req, res, next) => {
  const { email, username, content } = req.body;
  
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (username && !validator.isAlphanumeric(username)) {
    return res.status(400).json({ error: 'Username must be alphanumeric' });
  }
  
  // Sanitize against NoSQL injection
  mongoSanitize(req.body);
  
  next();
};
          </code></pre>
          
          <h3>XSS Prevention</h3>
          <pre><code>
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Sanitize HTML content
const sanitizeHtml = (dirty) => {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

// Use Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
          </code></pre>
          
          <h2>HTTPS and Transport Security</h2>
          
          <h3>Enforce HTTPS Everywhere</h3>
          <pre><code>
// Force HTTPS in production
const forceHTTPS = (req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(\`https://\${req.get('host')}\${req.url}\`);
  }
  next();
};

if (process.env.NODE_ENV === 'production') {
  app.use(forceHTTPS);
}

// Set security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
          </code></pre>
          
          <h2>Dependency Security</h2>
          
          <h3>Regular Security Audits</h3>
          <pre><code>
# Regular npm audit
npm audit --audit-level moderate

# Automated dependency updates
npm install -g npm-check-updates
ncu -u

# Use tools like Snyk for continuous monitoring
npx snyk test
npx snyk monitor
          </code></pre>
          
          <h2>Rate Limiting and DDoS Protection</h2>
          <pre><code>
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
          </code></pre>
          
          <h2>Monitoring and Incident Response</h2>
          <ul>
            <li>Implement comprehensive logging and monitoring</li>
            <li>Set up alerts for suspicious activities</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Incident response plan and team training</li>
            <li>Regular backup and recovery testing</li>
          </ul>
          
          <p>Security is not a one-time implementation but an ongoing process. Stay updated with the latest threats, regularly review your security measures, and always follow the principle of least privilege!</p>
        `,
        excerpt: 'Comprehensive guide to web security in 2025, covering authentication, input validation, HTTPS, dependency security, and threat mitigation strategies.',
        author: authorUser._id,
        isPublished: true,
        featured: true,
        tags: ['security', 'web-development', 'backend', 'frontend']
      },
      
      {
        title: 'Performance Optimization Techniques for Web Applications',
        content: `
          <h1>Performance Optimization Techniques for Web Applications</h1>
          
          <p>In today's fast-paced digital world, application performance can make or break user experience. A slow application leads to user frustration, decreased engagement, and ultimately lost revenue. Let's explore comprehensive strategies for optimizing web application performance.</p>
          
          <h2>Understanding Performance Metrics</h2>
          <p>Before optimizing, it's crucial to understand what to measure:</p>
          
          <h3>Core Web Vitals</h3>
          <ul>
            <li><strong>Largest Contentful Paint (LCP):</strong> Loading performance (&lt; 2.5s)</li>
            <li><strong>First Input Delay (FID):</strong> Interactivity (&lt; 100ms)</li>
            <li><strong>Cumulative Layout Shift (CLS):</strong> Visual stability (&lt; 0.1)</li>
          </ul>
          
          <h3>Additional Metrics</h3>
          <ul>
            <li>Time to First Byte (TTFB)</li>
            <li>First Contentful Paint (FCP)</li>
            <li>Time to Interactive (TTI)</li>
            <li>Total Blocking Time (TBT)</li>
          </ul>
          
          <h2>Frontend Optimization Strategies</h2>
          
          <h3>Code Splitting and Lazy Loading</h3>
          <pre><code>
// React lazy loading
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

// Dynamic imports in vanilla JavaScript
const loadModule = async () => {
  const module = await import('./heavyModule.js');
  module.initialize();
};
          </code></pre>
          
          <h3>Image Optimization</h3>
          <pre><code>
<!-- Modern image formats with fallbacks -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Optimized image" loading="lazy">
</picture>

<!-- Responsive images -->
<img 
  srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 480px) 100vw, (max-width: 800px) 50vw, 25vw"
  src="fallback.jpg" 
  alt="Responsive image"
  loading="lazy"
>
          </code></pre>
          
          <h3>CSS and JavaScript Optimization</h3>
          <pre><code>
// CSS optimization
/* Use CSS custom properties for theming */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
}

/* Avoid deep nesting and overly specific selectors */
.card { /* Good */ }
.container .row .col .card { /* Avoid */ }

// JavaScript optimization
// Debounce expensive operations
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const expensiveOperation = debounce(() => {
  // Expensive DOM manipulation or API calls
}, 300);

// Use Web Workers for heavy computations
const worker = new Worker('calculation-worker.js');
worker.postMessage({ data: largeDataSet });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};
          </code></pre>
          
          <h2>Backend Optimization Strategies</h2>
          
          <h3>Database Optimization</h3>
          <pre><code>
// MongoDB indexing strategies
db.posts.createIndex({ "author": 1, "publishedAt": -1 });
db.posts.createIndex({ "tags": 1 });
db.posts.createIndex({ "title": "text", "content": "text" });

// Query optimization
// Good: Use projection to limit returned fields
db.posts.find({ status: "published" }, { title: 1, excerpt: 1, publishedAt: 1 });

// Good: Use aggregation for complex queries
db.posts.aggregate([
  { $match: { status: "published" } },
  { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorInfo" } },
  { $limit: 10 }
]);

// Use connection pooling
const mongoose = require('mongoose');
mongoose.connect(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
          </code></pre>
          
          <h3>Caching Strategies</h3>
          <pre><code>
const redis = require('redis');
const client = redis.createClient();

// Redis caching middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = \`cache:\${req.originalUrl}\`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        client.setex(key, duration, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// Use caching for expensive operations
app.get('/api/posts', cacheMiddleware(600), async (req, res) => {
  const posts = await Post.find().populate('author');
  res.json(posts);
});
          </code></pre>
          
          <h3>API Optimization</h3>
          <pre><code>
// Implement pagination
const paginateResults = async (model, query = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 10, 100);
  const skip = (page - 1) * limit;
  
  const [items, totalItems] = await Promise.all([
    model.find(query)
      .select(options.select)
      .populate(options.populate)
      .sort(options.sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments(query)
  ]);
  
  return {
    items,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      hasNext: page < Math.ceil(totalItems / limit),
      hasPrev: page > 1
    }
  };
};

// Implement field selection
app.get('/api/posts', async (req, res) => {
  const { fields, ...query } = req.query;
  const select = fields ? fields.split(',').join(' ') : '';
  
  const result = await paginateResults(Post, query, { select });
  res.json(result);
});
          </code></pre>
          
          <h2>CDN and Asset Delivery</h2>
          <pre><code>
// Express.js static file optimization
const express = require('express');
const compression = require('compression');
const app = express();

// Enable gzip compression
app.use(compression());

// Set cache headers for static assets
app.use('/static', express.static('public', {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true
}));

// Set appropriate headers
app.use((req, res, next) => {
  // Enable browser caching for API responses
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  next();
});
          </code></pre>
          
          <h2>Performance Monitoring</h2>
          <pre><code>
// Custom performance monitoring
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.path} - \${duration}ms\`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(\`Slow request detected: \${req.path} took \${duration}ms\`);
    }
  });
  
  next();
};

app.use(performanceMonitor);

// Client-side performance monitoring
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  const metrics = {
    loadTime: perfData.loadEventEnd - perfData.fetchStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
    firstByte: perfData.responseStart - perfData.fetchStart
  };
  
  // Send metrics to analytics service
  analytics.track('page_performance', metrics);
});
          </code></pre>
          
          <h2>Performance Testing</h2>
          <ul>
            <li><strong>Lighthouse:</strong> Automated auditing for performance, accessibility, and SEO</li>
            <li><strong>WebPageTest:</strong> Detailed waterfall analysis and real-world testing</li>
            <li><strong>Load Testing:</strong> Tools like Artillery, JMeter, or k6 for stress testing</li>
            <li><strong>Continuous Monitoring:</strong> Set up alerts for performance regressions</li>
          </ul>
          
          <p>Remember, performance optimization is an ongoing process. Regular monitoring, testing, and gradual improvements will ensure your application remains fast and responsive as it grows!</p>
        `,
        excerpt: 'Complete guide to web application performance optimization covering frontend, backend, database, caching, and monitoring strategies.',
        author: authorUser._id,
        isPublished: true,
        tags: ['performance', 'optimization', 'web-development', 'tutorial']
      }
    ];

    for (const postData of samplePosts) {
      const existingPost = await Post.findOne({ title: postData.title });
      if (!existingPost) {
        await Post.create(postData);
        console.log(`   ✅ Created sample post: ${postData.title}`);
      } else {
        console.log(`   ⏭️  Post exists: ${postData.title}`);
      }
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • All privileges have been created and imported');
    console.log('   • Comprehensive role system established (superadmin, admin, editor, author, regular)');
    console.log('   • Superadmin user created for full system access');
    console.log('   • Sample tags created for content organization');
    console.log('   • Multiple sample blog posts created');
    console.log('\n🔐 Login Credentials:');
    console.log('   Superadmin - Email: superadmin@myblog.com | Username: superadmin | Password: SuperAdmin2025!@#');
    console.log('   Admin - Email: admin@myblog.com | Username: admin_myblog | Password: MyBl0g@dm1n2025!');
    console.log('\n🚀 Your blog is ready to use!');
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

initializeDB()
  .then(() => {
    console.log('\n✅ Database initialization completed successfully');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    mongoose.disconnect();
    process.exit(1);
  });