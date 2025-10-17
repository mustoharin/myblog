import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  PostAdd as PostIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

const ACTIVITY_ICONS = {
  post_create: <PostIcon color="primary" />,
  post_update: <EditIcon color="primary" />,
  post_delete: <DeleteIcon color="error" />,
  user_create: <PersonIcon color="success" />,
  user_update: <EditIcon color="success" />,
  user_delete: <DeleteIcon color="error" />,
  comment_create: <CommentIcon color="info" />,
  comment_delete: <DeleteIcon color="error" />,
};

const RecentActivity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/admin/activities', {
        params: { limit: 10 }
      });
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, activity) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedActivity(activity);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedActivity(null);
  };

  const getActivityDescription = (activity) => {
    const actor = activity.user?.fullName || activity.user?.username || 'System';
    switch (activity.type) {
      case 'post_create':
        return `${actor} created a new post "${activity.data.title}"`;
      case 'post_update':
        return `${actor} updated post "${activity.data.title}"`;
      case 'post_delete':
        return `${actor} deleted post "${activity.data.title}"`;
      case 'user_create':
        return `New user account created: ${activity.data.fullName || activity.data.username}`;
      case 'user_update':
        return `${actor} updated user ${activity.data.username}`;
      case 'user_delete':
        return `${actor} deleted user ${activity.data.username}`;
      case 'comment_create':
        return `${actor} commented on "${activity.data.postTitle}"`;
      case 'comment_delete':
        return `${actor} deleted a comment on "${activity.data.postTitle}"`;
      default:
        return 'Unknown activity';
    }
  };

  const handleViewDetails = () => {
    if (!selectedActivity) return;

    const { type, data } = selectedActivity;
    switch (type) {
      case 'post_create':
      case 'post_update':
        navigate(`/admin/posts/edit/${data.id}`);
        break;
      case 'post_delete':
        navigate('/admin/posts');
        break;
      case 'user_create':
      case 'user_update':
        navigate(`/admin/users/edit/${data.id}`);
        break;
      case 'user_delete':
        navigate('/admin/users');
        break;
      case 'comment_create':
      case 'comment_delete':
        navigate(`/admin/posts/edit/${data.postId}`);
        break;
      default:
        console.warn('Unknown activity type:', type);
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>Loading activities...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Recent Activity
        </Typography>
        <Chip
          label="Live"
          color="success"
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>

      {activities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No recent activity
          </Typography>
        </Box>
      ) : (
        <List>
          {activities.map((activity) => (
            <ListItem
              key={activity._id}
              alignItems="flex-start"
              secondaryAction={
                <IconButton 
                  edge="end" 
                  size="small"
                  onClick={(e) => handleMenuOpen(e, activity)}
                >
                  <MoreVertIcon />
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar>
                  {ACTIVITY_ICONS[activity.type]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={getActivityDescription(activity)}
                secondary={
                  <React.Fragment>
                    <Typography
                      sx={{ display: 'block' }}
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'No timestamp'}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, yyyy HH:mm:ss') : 'No timestamp'}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
      </Menu>
    </Paper>
  );
};

export default RecentActivity;