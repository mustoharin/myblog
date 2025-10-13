import React, { useState } from 'react';

const PostsTable = ({ posts, onEdit, onDelete }) => {
  return (
    <div className="posts-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post._id}>
              <td>{post.title}</td>
              <td>{post.author.username}</td>
              <td>{new Date(post.createdAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => onEdit(post)}>Edit</button>
                <button onClick={() => onDelete(post._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PostsTable;