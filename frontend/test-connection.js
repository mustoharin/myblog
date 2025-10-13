// Simple test script to verify frontend can connect to backend
const axios = require('axios');

async function testBackendConnection() {
  try {
    console.log('Testing connection to backend...');
    
    // Test getting posts
    const response = await axios.get('http://localhost:5001/api/posts');
    console.log('Successfully connected to backend');
    console.log('Posts:', response.data);
    
    // Test creating a post
    const newPost = {
      title: 'Test from Frontend',
      content: 'This is a test post created from a frontend test script',
      author: 'Frontend Test'
    };
    
    const createResponse = await axios.post('http://localhost:5001/api/posts', newPost);
    console.log('Successfully created post:', createResponse.data);
    
    // Test deleting the post
    await axios.delete(`http://localhost:5001/api/posts/${createResponse.data._id}`);
    console.log('Successfully deleted post');
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBackendConnection();