import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Collapse,
} from '@mui/material';
import {
  Reply as ReplyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CommentItem = ({ comment, onReply, canReply, level = 0 }) => {
  const [showReplies, setShowReplies] = useState(true);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const maxNestingLevel = 3; // Limit nesting depth for better UX

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      await onReply(comment._id, replyContent);
      setReplyContent('');
      setReplying(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const getAuthorName = comment => {
    if (comment.author.user) {
      return comment.author.user.fullName || comment.author.user.username;
    }
    return comment.author.name;
  };

  const getStatusColor = status => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'spam': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Paper 
        elevation={level === 0 ? 2 : 1} 
        sx={{ 
          p: 2, 
          ml: level * 3,
          backgroundColor: level % 2 === 0 ? 'background.paper' : 'grey.50',
        }}
      >
        {/* Comment Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {comment.author.user ? (
              getAuthorName(comment).charAt(0).toUpperCase()
            ) : (
              <PersonIcon />
            )}
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {getAuthorName(comment)}
              {comment.author.user && (
                <Chip 
                  label="Registered User" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Typography>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </Typography>
              
              {comment.status !== 'approved' && (
                <Chip 
                  label={comment.status} 
                  size="small" 
                  color={getStatusColor(comment.status)}
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Comment Content */}
        <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </Typography>

        {/* Comment Actions */}
        <Stack direction="row" spacing={1} alignItems="center">
          {canReply && level < maxNestingLevel && (
            <Button
              size="small"
              startIcon={<ReplyIcon />}
              onClick={() => setReplying(!replying)}
              variant="text"
            >
              Reply
            </Button>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <Button
              size="small"
              startIcon={showReplies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowReplies(!showReplies)}
              variant="text"
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} 
              {comment.replies.length === 1 ? ' reply' : ' replies'}
            </Button>
          )}
        </Stack>

        {/* Reply Form */}
        <Collapse in={replying}>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || submittingReply}
              >
                {submittingReply ? <CircularProgress size={16} /> : 'Post Reply'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setReplying(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Paper>

      {/* Nested Replies */}
      <Collapse in={showReplies}>
        <Box sx={{ mt: 1 }}>
          {comment.replies && comment.replies.map(reply => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onReply={onReply}
              canReply={canReply}
              level={level + 1}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const CommentsList = ({ postId, refreshTrigger }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { user } = useAuth();

  const canReply = user && (
    user.role?.name === 'admin' || 
    user.role?.name === 'superadmin' ||
    (user.role?.privileges && user.role.privileges.some(p => p.code === 'reply_comments'))
  );

  const fetchComments = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/comments/post/${postId}`, {
        params: { page, limit: 10 },
      });
      
      if (page === 1) {
        setComments(response.data.comments);
      } else {
        setComments(prev => [...prev, ...response.data.comments]);
      }
      
      setPagination(response.data.pagination);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (commentId, content) => {
    try {
      const response = await api.post(`/comments/reply/${commentId}`, { content });
      
      // Refresh comments to show the new reply
      await fetchComments(1);
      
      return response.data;
    } catch (error) {
      throw new Error('Failed to post reply');
    }
  };

  const loadMore = () => {
    if (pagination && pagination.hasNext) {
      fetchComments(currentPage + 1);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments(1);
    }
  }, [postId, refreshTrigger]);

  if (loading && comments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Comments ({pagination?.totalComments || 0})
      </Typography>

      {comments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        </Paper>
      ) : (
        <>
          {comments.map(comment => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onReply={handleReply}
              canReply={canReply}
              level={0}
            />
          ))}

          {pagination && pagination.hasNext && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Load More Comments'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default CommentsList;