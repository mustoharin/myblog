import React, { useState, useEffect } from 'react';

const RecentPosts = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/public/posts?limit=5');
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Error fetching recent posts:', error);
      }
    };

    fetchRecentPosts();
  }, []);

  return (
    <div className="recent-posts">
      <h3>Recent Posts</h3>
      <ul>
        {posts.map(post => (
          <li key={post._id}>
            <span className="post-title">{post.title}</span>
            <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentPosts;