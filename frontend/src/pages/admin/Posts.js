import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminSidebar from '../../components/admin/AdminSidebar';
import PostsTable from '../../components/admin/PostsTable';
import PostForm from '../../components/admin/PostForm';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          setPosts(posts.filter(post => post._id !== postId));
        }
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleEdit = (post) => {
    setSelectedPost(post);
    setShowForm(true);
  };

  const handleFormSubmit = async (postData) => {
    try {
      const url = selectedPost ? `/api/posts/${selectedPost._id}` : '/api/posts';
      const method = selectedPost ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        fetchPosts();
        setShowForm(false);
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  return (
    <div className="admin-posts">
      <AdminHeader />
      <div className="posts-container">
        <AdminSidebar />
        <main className="posts-content">
          <div className="posts-header">
            <h1>Manage Posts</h1>
            <button 
              className="new-post-btn"
              onClick={() => {
                setSelectedPost(null);
                setShowForm(true);
              }}
            >
              New Post
            </button>
          </div>

          {showForm ? (
            <PostForm 
              post={selectedPost}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setSelectedPost(null);
              }}
            />
          ) : (
            isLoading ? (
              <div>Loading...</div>
            ) : (
              <PostsTable 
                posts={posts}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default Posts;