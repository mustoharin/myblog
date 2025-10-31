import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import api from '../../../services/api';

const COLORS = ['#1976d2', '#43a047', '#ffa726']; // Improved color contrast

const MediaAnalyticsDashboard = ({ stats: initialStats, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [timeline, setTimeline] = useState([]);
  const [popularMedia, setPopularMedia] = useState({ mostUsed: [], leastUsed: [] });
  const [mediaByType, setMediaByType] = useState([]);

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  useEffect(() => {
    fetchDetailedAnalytics();
  }, []);

  const fetchDetailedAnalytics = async () => {
    try {
      setLoading(true);
      const [timelineRes, popularRes, typeRes] = await Promise.all([
        api.get('/media/analytics/timeline?days=30'),
        api.get('/media/analytics/popular?limit=5'),
        api.get('/media/analytics/by-type'),
      ]);

      setTimeline(timelineRes.data);
      setPopularMedia(popularRes.data);
      setMediaByType(typeRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDetailedAnalytics();
    if (onRefresh) onRefresh();
  };


  // Empty state handling
  if (loading && !stats) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" mt={2} color="text.secondary">Loading analytics data...</Typography>
      </Box>
    );
  }
  if (!stats) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <Typography variant="h6" color="text.secondary">No analytics data available.</Typography>
        <Button startIcon={<RefreshIcon />} onClick={handleRefresh} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={{ xs: 2, md: 4 }} py={2}>
        <Typography variant="h5" sx={{ letterSpacing: 0.5 }}>Analytics Overview</Typography>
        <Tooltip title="Refresh analytics data">
          <span>
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              Refresh
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Grid container spacing={3} sx={{ pl: { xs: 1, md: 3 } }}>
        {/* Usage Statistics */}
        <Grid item xs={12} md={12}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={500} fontSize={18}>
                Media Usage
              </Typography>
              <Box sx={{ height: { xs: 180, md: 300 } }}>
                {stats?.usage ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Used', value: stats.usage.used },
                        { name: 'Unused', value: stats.usage.unused },
                        { name: 'Deleted', value: stats.usage.deleted },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip formatter={(value, name) => [`${value}`, `${name}`]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 16 }} />
                      <Bar dataKey="value">
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[1]} />
                        <Cell fill={COLORS[2]} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No usage data available.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Breakdown */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={500} fontSize={18}>
                Storage Distribution
              </Typography>
              <Box sx={{ height: { xs: 180, md: 300 } }}>
                {stats?.storage ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Used',
                          size: parseFloat(stats.storage.used?.sizeMB || 0),
                          count: stats.storage.used?.count || 0,
                        },
                        {
                          name: 'Unused',
                          size: parseFloat(stats.storage.unused?.sizeMB || 0),
                          count: stats.storage.unused?.count || 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Size (MB)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={value => [`${value} MB`, 'Size']} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 14 }} />
                      <Bar dataKey="size" fill={COLORS[0]} name="Size (MB)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No storage data available.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upload Timeline */}
        <Grid item xs={12}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={500} fontSize={18}>
                Upload Timeline (Last 30 Days)
              </Typography>
              <Box sx={{ height: { xs: 180, md: 300 } }}>
                {timeline && timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Size (MB)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 14 }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="count"
                        stroke={COLORS[0]}
                        name="Files Uploaded"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="sizeMB"
                        stroke={COLORS[1]}
                        name="Size (MB)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No timeline data available.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Media by Type */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={500} fontSize={18}>
                Media by Type
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Total Size</TableCell>
                      <TableCell align="right">Avg Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mediaByType && mediaByType.length > 0 ? (
                      mediaByType.map(type => (
                        <TableRow key={type.mimeType}>
                          <TableCell>
                            <Tooltip title={type.mimeType}><Chip label={type.mimeType} size="small" /></Tooltip>
                          </TableCell>
                          <TableCell align="right">{type.count}</TableCell>
                          <TableCell align="right">{type.totalSizeMB?.toFixed(2)} MB</TableCell>
                          <TableCell align="right">{type.avgSizeMB?.toFixed(2)} MB</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">No type data available.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Used Media */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1} fontWeight={500} fontSize={18}>
                <TrendingUpIcon color="success" />
                Most Used Media
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Filename</TableCell>
                      <TableCell align="right">Usage Count</TableCell>
                      <TableCell align="right">Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popularMedia?.mostUsed && popularMedia.mostUsed.length > 0 ? (
                      popularMedia.mostUsed.map(media => (
                        <TableRow key={media._id}>
                          <TableCell>
                            <Tooltip title={media.originalName}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {media.originalName}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={media.usageCount} color="success" size="small" />
                          </TableCell>
                          <TableCell align="right">
                            {(media.size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">No most used media data available.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Least Used Media */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 340, md: 370 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1} fontWeight={500} fontSize={18}>
                <TrendingDownIcon color="warning" />
                Least Used Media
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Filename</TableCell>
                      <TableCell align="right">Usage Count</TableCell>
                      <TableCell align="right">Uploaded</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popularMedia?.leastUsed && popularMedia.leastUsed.length > 0 ? (
                      popularMedia.leastUsed.map(media => (
                        <TableRow key={media._id}>
                          <TableCell>
                            <Tooltip title={media.originalName}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {media.originalName}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={media.usageCount}
                              color={media.usageCount === 0 ? 'warning' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">No least used media data available.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MediaAnalyticsDashboard;
