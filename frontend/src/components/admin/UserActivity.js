import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

const UserActivity = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const response = await api.get('/admin/users/active');
      setActiveUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch active users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>Loading user activity...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          Active Users
        </Typography>
      </Box>

      <List>
        {activeUsers.map((user) => (
          <ListItem key={user._id}>
            <ListItemAvatar>
              <Avatar>
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={user.fullName || user.username}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  <Tooltip title={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'No activity data'}>
                    <Typography variant="caption">
                      {user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true }) : 'No recent activity'}
                    </Typography>
                  </Tooltip>
                </Box>
              }
            />
          </ListItem>
        ))}
        {activeUsers.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No active users in the last 15 minutes
          </Typography>
        )}
      </List>
    </Paper>
  );
};

export default UserActivity;