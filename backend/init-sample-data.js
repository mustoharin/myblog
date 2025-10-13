const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');
require('dotenv').config();

const samplePosts = [
  {
    title: 'Getting Started with Node.js and Express',
    content: `
      <h2>Introduction to Node.js</h2>
      <p>Node.js is a powerful JavaScript runtime built on Chrome's V8 JavaScript engine. It allows you to run JavaScript on the server side.</p>
      
      <h3>Why Node.js?</h3>
      <p>Node.js is perfect for building fast, scalable network applications. Its event-driven, non-blocking I/O model makes it lightweight and efficient.</p>
      
      <h3>Setting Up Express</h3>
      <p>Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.</p>
    `,
    excerpt: 'Learn the basics of Node.js and Express framework for building web applications.',
    tags: ['Node.js', 'Express', 'JavaScript', 'Backend'],
    featured: true
  },
  {
    title: 'React Fundamentals: Building User Interfaces',
    content: `
      <h2>Understanding React</h2>
      <p>React is a JavaScript library for building user interfaces, particularly single-page applications where you need a fast, interactive user experience.</p>
      
      <h3>Components and Props</h3>
      <p>Components are the building blocks of any React application. They let you split the UI into independent, reusable pieces.</p>
      
      <h3>State Management</h3>
      <p>React's state system allows you to build interactive applications that can update the display based on user actions.</p>
    `,
    excerpt: 'Dive into React.js and learn how to build modern user interfaces.',
    tags: ['React', 'JavaScript', 'Frontend', 'UI'],
    featured: true
  },
  {
    title: 'MongoDB: A NoSQL Database Solution',
    content: `
      <h2>Introduction to MongoDB</h2>
      <p>MongoDB is a document database with the scalability and flexibility that you want with the querying and indexing that you need.</p>
      
      <h3>Document Model</h3>
      <p>MongoDB stores data in flexible, JSON-like documents, meaning fields can vary from document to document and data structure can be changed over time.</p>
      
      <h3>CRUD Operations</h3>
      <p>Learn how to perform Create, Read, Update, and Delete operations in MongoDB using Mongoose with Node.js.</p>
    `,
    excerpt: 'Explore MongoDB and learn how to work with NoSQL databases.',
    tags: ['MongoDB', 'Database', 'NoSQL', 'Backend'],
    featured: false
  }
];

const initializeSampleData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get superadmin user
    const admin = await User.findOne({ username: 'superadmin' });
    if (!admin) {
      console.error('Superadmin user not found. Please run init-db.js first.');
      process.exit(1);
    }

    // Create sample posts
    for (const postData of samplePosts) {
      const existingPost = await Post.findOne({ title: postData.title });
      if (!existingPost) {
        await Post.create({
          ...postData,
          author: admin._id
        });
        console.log(`Created post: ${postData.title}`);
      }
    }

    console.log('Sample data initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing sample data:', error);
    process.exit(1);
  }
};

initializeSampleData();