import React, { useState, useEffect } from 'react';

const RecentComments = () => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // For now, we'll leave this as a placeholder since comments aren't implemented yet
    setComments([
      { id: 1, author: 'John Doe', content: 'Great post!', date: new Date() },
      { id: 2, author: 'Jane Smith', content: 'Very informative', date: new Date() },
    ]);
  }, []);

  return (
    <div className="recent-comments">
      <h3>Recent Comments</h3>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>
            <div className="comment-author">{comment.author}</div>
            <div className="comment-content">{comment.content}</div>
            <div className="comment-date">{comment.date.toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentComments;