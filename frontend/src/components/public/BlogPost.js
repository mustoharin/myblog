import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  Divider,
  Avatar,
  Paper,
  Skeleton,
  IconButton,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  CalendarToday as DateIcon,
  LocalOffer as TagIcon,
  Visibility as ViewsIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../services/api';
import { createSafeHTML } from '../../utils/htmlSanitizer';
import CommentSection from './CommentsSection';

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(async () => {
    if (!id) {
      setError('Invalid post ID');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error('Invalid post ID');
      }
      const response = await api.get(`/public/posts/${id}`);
      if (!response.data) {
        throw new Error('Post not found');
      }
      setPost(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching post:', error);
      if (error.message === 'Invalid post ID') {
        setError('Invalid post ID');
        navigate('/');
      } else if (error.response?.status === 404) {
        setError('Post not found or is not published');
        navigate('/');
      } else {
        setError(error.response?.data?.message || 'Failed to load post');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Track post view
  useEffect(() => {
    const trackView = async () => {
      if (post && post._id) {
        try {
          const response = await api.post(`/public/posts/${post._id}/view`);
          // Update the local view count with the response
          if (response.data?.views !== undefined) {
            setPost(prevPost => ({
              ...prevPost,
              views: response.data.views,
            }));
          }
        } catch (error) {
          // Silently fail - view tracking is not critical
          console.debug('Failed to track view:', error);
        }
      }
    };

    trackView();
  }, [post?._id]); // Only track when we have a valid post ID

  const handleShare = async () => {
    try {
      // Track the share on backend first
      await api.post(`/public/posts/${post._id}/share`);
      
      // Update local share count
      setPost(prevPost => ({
        ...prevPost,
        shares: (prevPost.shares || 0) + 1,
      }));

      // Try to use native share if available
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // You could show a toast notification here
        console.log('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share or other error
      console.debug('Share cancelled or failed:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={100} />
        </Box>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" count={3} />
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" color="error" align="center">
          {error || 'Post not found'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={() => navigate('/')}>
            Back to Blog
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Title and Meta */}
      <Typography variant="h3" component="h1" gutterBottom>
        {post.title}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 1 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="subtitle1">
            {post.author?.fullName || post.author?.username || 'Anonymous'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DateIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            {post.createdAt ? format(new Date(post.createdAt), 'MMMM d, yyyy') : 'Date unavailable'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ViewsIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            {post.views || 0} views
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ShareIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            {post.shares || 0} shares
          </Typography>
        </Box>

        <IconButton 
          onClick={handleShare} 
          sx={{ ml: 'auto' }}
          color="primary"
          aria-label="share post"
        >
          <ShareIcon />
        </IconButton>
      </Box>

      {/* Tags */}
      {Array.isArray(post.tags) && post.tags.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {post.tags.map(tag => {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            const tagLabel = typeof tag === 'string' ? tag : tag.displayName || tag.name;
            const tagColor = typeof tag === 'string' ? '#1976d2' : tag.color || '#1976d2';
            
            return (
              <Chip
                key={tagName}
                label={tagLabel}
                icon={<TagIcon />}
                onClick={() => navigate(`/?search=${encodeURIComponent(`#${tagName}`)}`)}
                sx={{ 
                  mr: 1, 
                  mb: 1,
                  backgroundColor: `${tagColor}20`,
                  color: tagColor,
                  borderColor: tagColor,
                  border: `1px solid ${tagColor}40`,
                  '& .MuiChip-icon': {
                    color: tagColor,
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      <Divider sx={{ mb: 4 }} />

      {/* Content */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box
          className="blog-content"
          dangerouslySetInnerHTML={createSafeHTML(post.content)}
          sx={{
            '& img': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 1,
            },
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              mt: 3,
              mb: 2,
            },
            '& p': {
              mb: 2,
              lineHeight: 1.7,
            },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              pl: 2,
              py: 1,
              my: 2,
              bgcolor: 'action.hover',
            },
            '& pre': {
              bgcolor: 'grey.900',
              color: 'common.white',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
            },
            '& code': {
              bgcolor: 'action.hover',
              px: 1,
              borderRadius: 0.5,
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          }}
        />
      </Paper>

      {/* Comments Section */}
      <CommentSection postId={id} />
    </Container>
  );
};

export default BlogPost;