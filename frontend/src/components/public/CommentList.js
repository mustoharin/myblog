import React from 'react';

const CommentList = ({ comments = [] }) => {
  if (!comments || !comments.length) return <div>No comments yet</div>;

  return (
    <div className="comment-list">
      {comments.map(comment => (
        <div key={comment._id} className="comment">
          <div className="comment-header">
            <span className="comment-author">{comment.authorName || comment.author?.name || 'Anonymous'}</span>
            <span className="comment-date">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="comment-content">{comment.content}</div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;