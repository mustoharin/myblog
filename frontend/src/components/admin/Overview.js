import React from 'react';
import { Grid } from '@mui/material';
import AdminStats from './AdminStats';
import PopularPosts from './PopularPosts';
import SystemStatus from './SystemStatus';
import UserActivity from './UserActivity';

const Overview = () => {
  return (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <Grid item xs={12}>
        <AdminStats />
      </Grid>

      {/* Popular Posts */}
      <Grid item xs={12} md={8}>
        <PopularPosts />
      </Grid>

      {/* System Status and User Activity */}
      <Grid item xs={12} md={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SystemStatus />
          </Grid>
          <Grid item xs={12}>
            <UserActivity />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Overview;