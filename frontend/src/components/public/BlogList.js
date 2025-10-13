import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BlogList = ({ featured = false }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const url = featured 
          ? 'http://localhost:5002/api/public/posts?featured=true' 
          : 'http://localhost:5002/api/public/posts';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch posts');
        
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [featured]);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="blog-list">
      {posts.map(post => (
        <article key={post._id} className="blog-card">
          {post.image && (
            <div className="blog-card-image">
              <img src={post.image} alt={post.title} />
            </div>
          )}
          <div className="blog-card-content">
            <h3>
              <Link to={`/blog/${post._id}`}>{post.title}</Link>
            </h3>
            <p className="blog-excerpt">{post.excerpt}</p>
            <div className="blog-metadata">
              <span className="author">
                By {post.author ? post.author.username : 'Unknown Author'}
              </span>
              <span className="date">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              {post.tags && post.tags.length > 0 && (
                <div className="tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default BlogList;