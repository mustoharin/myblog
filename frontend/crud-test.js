// Comprehensive frontend CRUD test
const axios = require('axios');

// Configure axios to use the proxy
const api = axios.create({
  baseURL: 'http://localhost:5001/api'
});

async function testCRUDOperations() {
  try {
    console.log('=== Testing Frontend CRUD Operations ===\n');
    
    // 1. Test getting all posts (READ - All)
    console.log('1. Testing GET /api/posts (Get all posts)');
    let response = await api.get('/posts');
    console.log('   Status:', response.status);
    console.log('   Posts count:', response.data.length);
    console.log('   Success!\n');
    
    // Store the initial posts count
    const initialCount = response.data.length;
    
    // 2. Test creating a new post (CREATE)
    console.log('2. Testing POST /api/posts (Create new post)');
    const newPost = {
      title: 'Frontend Test Post',
      content: 'This post was created through frontend CRUD testing',
      author: 'Frontend Tester'
    };
    
    response = await api.post('/posts', newPost);
    console.log('   Status:', response.status);
    console.log('   Created post ID:', response.data._id);
    console.log('   Success!\n');
    
    // Store the created post ID for later use
    const createdPostId = response.data._id;
    
    // 3. Test getting the specific post (READ - One)
    console.log('3. Testing GET /api/posts/:id (Get specific post)');
    response = await api.get(`/posts/${createdPostId}`);
    console.log('   Status:', response.status);
    console.log('   Post title:', response.data.title);
    console.log('   Success!\n');
    
    // 4. Test updating the post (UPDATE)
    console.log('4. Testing PUT /api/posts/:id (Update post)');
    const updatedPost = {
      title: 'Updated Frontend Test Post',
      content: 'This post was updated through frontend CRUD testing',
      author: 'Frontend Tester Updated'
    };
    
    response = await api.put(`/posts/${createdPostId}`, updatedPost);
    console.log('   Status:', response.status);
    console.log('   Updated title:', response.data.title);
    console.log('   Success!\n');
    
    // 5. Test getting all posts again to verify count
    console.log('5. Testing GET /api/posts (Verify post count)');
    response = await api.get('/posts');
    console.log('   Status:', response.status);
    console.log('   Posts count:', response.data.length);
    console.log('   Expected count:', initialCount + 1);
    console.log('   Count verified:', response.data.length === initialCount + 1 ? 'Success!' : 'Failed!');
    console.log('');
    
    // 6. Test deleting the post (DELETE)
    console.log('6. Testing DELETE /api/posts/:id (Delete post)');
    response = await api.delete(`/posts/${createdPostId}`);
    console.log('   Status:', response.status);
    console.log('   Response:', response.data.message);
    console.log('   Success!\n');
    
    // 7. Test getting all posts again to verify deletion
    console.log('7. Testing GET /api/posts (Verify post deletion)');
    response = await api.get('/posts');
    console.log('   Status:', response.status);
    console.log('   Posts count:', response.data.length);
    console.log('   Expected count:', initialCount);
    console.log('   Count verified:', response.data.length === initialCount ? 'Success!' : 'Failed!');
    console.log('');
    
    console.log('=== All CRUD Operations Completed Successfully! ===');
    
  } catch (error) {
    console.error('Error during CRUD testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCRUDOperations();