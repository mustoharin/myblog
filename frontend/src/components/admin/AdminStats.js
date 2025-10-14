import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Person as PersonIcon,
  Visibility as ViewsIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const StatCard = ({ title, value, icon: Icon, loading, error }) => (
  <Paper sx={{ p: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          bgcolor: 'primary.main',
          borderRadius: '50%',
          p: 1,
          mr: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Icon sx={{ color: 'white' }} />
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={20} />
        ) : error ? (
          <Typography color="error">Error</Typography>
        ) : (
          <Typography variant="h6">{value}</Typography>
        )}
      </Box>
    </Box>
  </Paper>
);

const AdminStats = () => {
  const [stats, setStats] = useState({
    posts: { value: 0, loading: true },
    users: { value: 0, loading: true },
    views: { value: 0, loading: true },
    comments: { value: 0, loading: true },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats({
          posts: { value: response.data.totalPosts, loading: false },
          users: { value: response.data.totalUsers, loading: false },
          views: { value: response.data.totalViews, loading: false },
          comments: { value: response.data.totalComments, loading: false },
        });
      } catch (error) {
        setStats(prev => ({
          posts: { ...prev.posts, loading: false, error: true },
          users: { ...prev.users, loading: false, error: true },
          views: { ...prev.views, loading: false, error: true },
          comments: { ...prev.comments, loading: false, error: true },
        }));
      }
    };

    fetchStats();
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Posts"
          value={stats.posts.value}
          icon={ArticleIcon}
          loading={stats.posts.loading}
          error={stats.posts.error}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Users"
          value={stats.users.value}
          icon={PersonIcon}
          loading={stats.users.loading}
          error={stats.users.error}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Views"
          value={stats.views.value}
          icon={ViewsIcon}
          loading={stats.views.loading}
          error={stats.views.error}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Comments"
          value={stats.comments.value}
          icon={CommentIcon}
          loading={stats.comments.loading}
          error={stats.comments.error}
        />
      </Grid>
    </Grid>
  );
};

export default AdminStats;