db = db.getSiblingDB('myblog');

// Create a user for the myblog database
db.createUser({
  user: 'admin',
  pwd: 'password123',
  roles: [
    {
      role: 'readWrite',
      db: 'myblog'
    }
  ]
});

// Create a sample collection to test
db.createCollection('posts');