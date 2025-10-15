import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentForm, setCommentForm] = useState({
    name: '',
    content: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState({
    sessionId: '',
    imageDataUrl: '',
    text: ''
  });

  const fetchCaptcha = async () => {
    try {
      const response = await api.get('/auth/captcha');
      setCaptcha(prev => ({
        ...prev,
        sessionId: response.data.sessionId,
        imageDataUrl: response.data.imageDataUrl,
        text: ''
      }));
    } catch (error) {
      console.error('Failed to fetch CAPTCHA:', error);
      setError('Failed to load CAPTCHA. Please try again.');
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
      fetchCaptcha();
    }
  }, [postId]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/public/posts/${postId}`);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, content } = commentForm;
    
    if (!name.trim() || !content.trim()) {
      setError('Both name and comment are required');
      return;
    }

    if (content.length > 1000) {
      setError('Comment must be less than 1000 characters');
      return;
    }

    if (name.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    const commentData = {
      name,
      content
    };

    // In test environment, use bypass token
    if (process.env.NODE_ENV == 'development' || process.env.REACT_APP_TEST_MODE === 'true') {
      commentData.testBypassToken = process.env.REACT_APP_TEST_BYPASS_CAPTCHA_TOKEN;
    } else {
      // In production, require CAPTCHA
      if (!captcha.text.trim()) {
        setError('Please enter the CAPTCHA code');
        setSubmitting(false);
        return;
      }
      commentData.captchaSessionId = captcha.sessionId;
      commentData.captchaText = captcha.text;
    }

    try {
      const response = await api.post(`/public/posts/${postId}/comments`, commentData);

      setComments([...comments, response.data]);
      setCommentForm({ name: '', content: '' });
      // Get a fresh CAPTCHA for the next comment
      fetchCaptcha();
    } catch (error) {
      console.error('Failed to post comment:', error);
      setError(error.response?.data?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCommentForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Comments {comments.length > 0 && `(${comments.length})`}
      </Typography>

      {/* Comment Form */}
      <Paper sx={{ p: 3, mb: 4 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Leave a Comment
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Your Name"
          name="name"
          value={commentForm.name}
          onChange={handleInputChange}
          margin="normal"
          required
          inputProps={{ maxLength: 50 }}
          disabled={submitting}
        />

        <TextField
          fullWidth
          label="Your Comment"
          name="content"
          value={commentForm.content}
          onChange={handleInputChange}
          margin="normal"
          required
          multiline
          rows={4}
          inputProps={{ maxLength: 1000 }}
          disabled={submitting}
          helperText={`${commentForm.content.length}/1000 characters`}
        />

        <Box sx={{ mt: 2, mb: 2 }}>
          {captcha.imageDataUrl ? (
            <>
              <img 
                src={captcha.imageDataUrl} 
                alt="CAPTCHA" 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} 
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Enter CAPTCHA"
                  value={captcha.text}
                  onChange={(e) => setCaptcha(prev => ({ ...prev, text: e.target.value }))}
                  required
                  size="small"
                  sx={{ flexGrow: 1 }}
                  disabled={submitting}
                />
                <Button
                  onClick={fetchCaptcha}
                  disabled={submitting}
                  size="small"
                >
                  New CAPTCHA
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="warning">
              Loading CAPTCHA...
            </Alert>
          )}
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{ mt: 2 }}
        >
          {submitting ? <CircularProgress size={24} /> : 'Post Comment'}
        </Button>
      </Paper>

      {/* Comments List */}
      {comments.length > 0 ? (
        comments.map((comment, index) => (
          <Paper key={comment._id || index} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {comment.authorName}
              </Typography>
              <Typography variant="caption" sx={{ ml: 2 }}>
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
            <Typography variant="body1">{comment.content}</Typography>
          </Paper>
        ))
      ) : (
        <Typography color="text.secondary" align="center">
          No comments yet. Be the first to comment!
        </Typography>
      )}
    </Box>
  );
};

export default CommentSection;