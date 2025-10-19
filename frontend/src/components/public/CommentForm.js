import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CommentForm = ({ postId, onCommentSubmitted }) => {
  const [formData, setFormData] = useState({
    content: '',
    authorName: '',
    authorEmail: '',
    authorWebsite: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { user } = useAuth();

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.content.trim()) {
      setError('Comment content is required');
      return false;
    }

    if (formData.content.length > 1000) {
      setError('Comment must be less than 1000 characters');
      return false;
    }

    if (!user) {
      if (!formData.authorName.trim()) {
        setError('Name is required');
        return false;
      }

      if (!formData.authorEmail.trim()) {
        setError('Email is required');
        return false;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.authorEmail)) {
        setError('Please enter a valid email address');
        return false;
      }

      if (!agreedToTerms) {
        setError('Please agree to the terms and conditions');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const submitData = {
        content: formData.content.trim(),
        postId,
      };

      // Add author information for non-authenticated users
      if (!user) {
        submitData.authorName = formData.authorName.trim();
        submitData.authorEmail = formData.authorEmail.trim();
        if (formData.authorWebsite.trim()) {
          submitData.authorWebsite = formData.authorWebsite.trim();
        }
      }

      const response = await api.post('/comments', submitData);

      if (user) {
        setSuccess('Comment posted successfully!');
      } else {
        setSuccess('Comment submitted for moderation. It will appear after approval.');
      }

      // Reset form
      setFormData({
        content: '',
        authorName: '',
        authorEmail: '',
        authorWebsite: '',
      });
      setAgreedToTerms(false);

      // Notify parent component
      if (onCommentSubmitted) {
        onCommentSubmitted(response.data.comment);
      }

    } catch (err) {
      setError(
        err.response?.data?.message 
        || 'Failed to submit comment. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Card sx={{ mt: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {user ? 'Leave a Comment' : 'Join the Discussion'}
        </Typography>

        {user && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Commenting as <strong>{user.fullName || user.username}</strong>
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Comment Content */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your comment"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            onFocus={resetMessages}
            placeholder={user 
              ? 'Share your thoughts...' 
              : 'What do you think about this post?'
            }
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 1000 }}
            helperText={`${formData.content.length}/1000 characters`}
          />

          {/* Author Information (for non-authenticated users) */}
          {!user && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Name *"
                  name="authorName"
                  value={formData.authorName}
                  onChange={handleInputChange}
                  onFocus={resetMessages}
                  placeholder="Your full name"
                />
                <TextField
                  fullWidth
                  label="Email *"
                  name="authorEmail"
                  type="email"
                  value={formData.authorEmail}
                  onChange={handleInputChange}
                  onFocus={resetMessages}
                  placeholder="your@email.com"
                  helperText="Your email will not be published"
                />
              </Stack>

              <TextField
                fullWidth
                label="Website (optional)"
                name="authorWebsite"
                value={formData.authorWebsite}
                onChange={handleInputChange}
                onFocus={resetMessages}
                placeholder="https://yourwebsite.com"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={(
                  <Checkbox
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                  />
                )}
                label={(
                  <Typography variant="body2">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" rel="noopener">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" rel="noopener">
                      Privacy Policy
                    </Link>
                  </Typography>
                )}
                sx={{ mb: 2 }}
              />
            </>
          )}

          {/* Error and Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Submit Button */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {!user && 'Comments are moderated and may take some time to appear.'}
            </Typography>
            
            <Button
              type="submit"
              variant="contained"
              endIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
              disabled={submitting || (!user && !agreedToTerms)}
              sx={{ minWidth: 120 }}
            >
              {submitting ? 'Submitting...' : 'Post Comment'}
            </Button>
          </Stack>

          {/* Guidelines for anonymous users */}
          {!user && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Comment Guidelines:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Be respectful and constructive</li>
                  <li>Stay on topic</li>
                  <li>No spam or promotional content</li>
                  <li>Comments are moderated and may take time to appear</li>
                </ul>
              </Typography>
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CommentForm;