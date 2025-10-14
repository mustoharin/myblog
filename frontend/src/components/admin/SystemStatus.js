import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/system/status');
      setStatus(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch system status');
      console.error('Failed to fetch system status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (value, threshold) => {
    if (value >= threshold.high) return 'error';
    if (value >= threshold.medium) return 'warning';
    return 'success';
  };

  const StatusItem = ({ icon: Icon, title, value, total, unit, thresholds }) => {
    const percentage = (value / total) * 100;
    const color = getStatusColor(percentage, thresholds);

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Icon color="action" sx={{ mr: 1 }} />
          <Typography variant="body2">{title}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ flexGrow: 1, mr: 1 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              color={color}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(value)} / {formatBytes(total)}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading && !status) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>Loading system status...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" component="h2">
          System Status
        </Typography>
        <IconButton size="small" onClick={fetchStatus} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error ? (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <WarningIcon sx={{ mr: 1 }} />
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Box>
          <StatusItem
            icon={StorageIcon}
            title="Database Storage"
            value={status?.database?.used || 0}
            total={status?.database?.total || 1}
            unit="GB"
            thresholds={{ medium: 70, high: 90 }}
          />

          <StatusItem
            icon={MemoryIcon}
            title="Memory Usage"
            value={status?.memory?.used || 0}
            total={status?.memory?.total || 1}
            unit="MB"
            thresholds={{ medium: 70, high: 85 }}
          />

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <Tooltip title="Average response time">
                <Box sx={{ textAlign: 'center' }}>
                  <NetworkIcon color="action" />
                  <Typography variant="h6">
                    {status?.performance?.responseTime || 0}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Response Time
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={6}>
              <Tooltip title="Requests per minute">
                <Box sx={{ textAlign: 'center' }}>
                  <NetworkIcon color="action" />
                  <Typography variant="h6">
                    {status?.performance?.requestsPerMinute || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requests/min
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Last updated: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SystemStatus;