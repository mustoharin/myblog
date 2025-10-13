import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';
import PostForm from './PostForm';
import axios from 'axios';

const Admin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Fetch all posts
  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/posts', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPosts(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching posts: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  // Add a new post
  const addPost = async (post) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/posts', post, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPosts([response.data, ...posts]);
    } catch (err) {
      setError('Error adding post: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete a post
  const deletePost = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPosts(posts.filter(post => post._id !== id));
    } catch (err) {
      setError('Error deleting post: ' + (err.response?.data?.message || err.message));
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Get current user
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data.user);
    } catch (err) {
      // If token is invalid, redirect to login
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-info">
          {user && <span>Welcome, {user.username}!</span>}
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      <main>
        <PostForm addPost={addPost} />
        <PostList posts={posts} deletePost={deletePost} />
      </main>
    </div>
  );
};

export default Admin;