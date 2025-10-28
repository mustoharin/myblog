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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Analytics Overview</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Usage Statistics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 370, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <CardContent sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 0 }}>
              <Typography variant="h6" gutterBottom align="center">
                Media Usage
              </Typography>
              <Box sx={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stats?.usage && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: stats.usage.used },
                          { name: 'Unused', value: stats.usage.unused },
                          { name: 'Deleted', value: stats.usage.deleted },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Used', value: stats.usage.used },
                          { name: 'Unused', value: stats.usage.unused },
                          { name: 'Deleted', value: stats.usage.deleted },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                {stats?.storage && (
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
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="size" fill="#8884d8" name="Size (MB)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upload Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Timeline (Last 30 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
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
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      name="Files Uploaded"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sizeMB"
                      stroke="#82ca9d"
                      name="Size (MB)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Media by Type */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
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
                    {mediaByType.map(type => (
                      <TableRow key={type.mimeType}>
                        <TableCell>
                          <Chip label={type.mimeType} size="small" />
                        </TableCell>
                        <TableCell align="right">{type.count}</TableCell>
                        <TableCell align="right">{type.totalSizeMB?.toFixed(2)} MB</TableCell>
                        <TableCell align="right">{type.avgSizeMB?.toFixed(2)} MB</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Used Media */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
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
                    {popularMedia.mostUsed.map(media => (
                      <TableRow key={media._id}>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {media.originalName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={media.usageCount} color="success" size="small" />
                        </TableCell>
                        <TableCell align="right">
                          {(media.size / 1024 / 1024).toFixed(2)} MB
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Least Used Media */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
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
                    {popularMedia.leastUsed.map(media => (
                      <TableRow key={media._id}>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {media.originalName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={media.usageCount}
                            color={media.usageCount === 0 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            {new Date(media.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
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
