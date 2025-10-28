import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Photo as MediaIcon,
  DeleteOutline as OrphanedIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as ValidationIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import MediaAnalyticsDashboard from './media/MediaAnalyticsDashboard';
import OrphanedMediaManager from './media/OrphanedMediaManager';
import ContentValidation from './media/ContentValidation';
import MediaStorageStats from './media/MediaStorageStats';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`media-tabpanel-${index}`}
      aria-labelledby={`media-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const MediaManager = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchMediaStats();
  }, []);

  const fetchMediaStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/media/analytics/dashboard');
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch media stats:', err);
      setError('Failed to load media statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Media Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage, analyze, and optimize your media library
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <MediaIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{stats.usage?.total || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Media
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <OrphanedIcon color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{stats.orphaned?.count || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Orphaned Files
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AnalyticsIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{stats.usage?.usageRate || 0}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Usage Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ValidationIcon color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">
                      {stats.storage?.total?.sizeMB || 0} MB
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Storage Used
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs Navigation */}
      <Card>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Analytics Dashboard" />
          <Tab label="Orphaned Media" />
          <Tab label="Content Validation" />
          <Tab label="Storage Details" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <MediaAnalyticsDashboard stats={stats} onRefresh={fetchMediaStats} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <OrphanedMediaManager onCleanup={fetchMediaStats} />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ContentValidation />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <MediaStorageStats stats={stats} />
        </TabPanel>
      </Card>
    </Container>
  );
};

export default MediaManager;
