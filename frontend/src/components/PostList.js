import React from 'react';

const PostList = ({ posts, deletePost }) => {
  return (
    <div className="post-list">
      <h2>Blog Posts</h2>
      {posts.length === 0 ? (
        <p>No posts yet. Be the first to create one!</p>
      ) : (
        posts.map(post => (
          <div key={post._id} className="post-item">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <small>Created: {new Date(post.date).toLocaleDateString()}</small>
            <button onClick={() => deletePost(post._id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
};

export default PostList;