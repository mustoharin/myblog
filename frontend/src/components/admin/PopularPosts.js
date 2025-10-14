import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tab,
  Tabs,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  Visibility as ViewsIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TIMEFRAMES = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

const PopularPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/admin/posts/popular', {
        params: { timeframe, limit: 5 }
      });
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Failed to fetch popular posts:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchPosts();
  }, [timeframe, fetchPosts]);

  const handleTimeframeChange = (event, newValue) => {
    setTimeframe(newValue);
  };

  const handleMenuOpen = (event, post) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPost(post);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPost(null);
  };

  const handleEdit = () => {
    navigate(`/admin/posts/edit/${selectedPost._id}`);
    handleMenuClose();
  };

  const handleView = () => {
    window.open(`/blog/${selectedPost._id}`, '_blank');
    handleMenuClose();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>Loading popular posts...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h2">
            Popular Posts
          </Typography>
        </Box>
        <Tabs
          value={timeframe}
          onChange={handleTimeframeChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {Object.entries(TIMEFRAMES).map(([value, label]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
      </Box>

      <List>
        {posts.map((post, index) => (
          <ListItem
            key={post._id}
            alignItems="flex-start"
            secondaryAction={
              <IconButton 
                edge="end" 
                size="small"
                onClick={(e) => handleMenuOpen(e, post)}
              >
                <OpenIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {index + 1}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={post.title}
              secondary={
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ViewsIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption">
                      {post.views || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CommentIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption">
                      {post.commentsCount || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShareIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption">
                      {post.sharesCount || 0}
                    </Typography>
                  </Box>
                  <Chip
                    label={post.status}
                    size="small"
                    color={post.status === 'published' ? 'success' : 'default'}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>View Post</MenuItem>
        <MenuItem onClick={handleEdit}>Edit Post</MenuItem>
      </Menu>
    </Paper>
  );
};

export default PopularPosts;