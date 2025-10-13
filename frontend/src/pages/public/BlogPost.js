import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/public/Header';
import CommentForm from '../../components/public/CommentForm';
import CommentList from '../../components/public/CommentList';

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`http://localhost:5002/api/public/posts/${id}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        
        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!post) return <div>Post not found</div>;

  return (
    <div className="blog-post-page">
      <Header />
      <div className="container">
        <article className="blog-post">
          <header className="blog-post-header">
            <h1>{post.title}</h1>
            <div className="blog-post-meta">
              <span className="author">
                By {post.author ? post.author.username : 'Unknown Author'}
              </span>
              <span className="date">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              {post.tags && post.tags.length > 0 && (
                <div className="tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {post.image && (
            <div className="blog-post-image">
              <img src={post.image} alt={post.title} />
            </div>
          )}
          
          <div 
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />
          
          <section className="blog-post-comments">
            <h3>Comments</h3>
            <CommentList comments={post.comments || []} />
            <CommentForm postId={post._id} />
          </section>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;