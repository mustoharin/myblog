import { useState } from 'react';
import { Box, Divider } from '@mui/material';
import CommentForm from './CommentForm';
import CommentsList from './CommentsList';

const CommentsSection = ({ postId }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCommentSubmitted = () => {
    // Trigger a refresh of the comments list
    setRefreshTrigger(prev => prev + 1);
  };

  if (!postId) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 3 }} />
      
      {/* Comment Form */}
      <CommentForm 
        postId={postId} 
        onCommentSubmitted={handleCommentSubmitted}
      />
      
      {/* Comments List */}
      <CommentsList 
        postId={postId} 
        refreshTrigger={refreshTrigger}
      />
    </Box>
  );
};

export default CommentsSection;