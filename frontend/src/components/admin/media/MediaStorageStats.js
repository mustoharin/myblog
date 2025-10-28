import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Paper,
  Stack,
  Chip,
  Grid,
} from '@mui/material';
import {
  Storage as StorageIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

const MediaStorageStats = ({ stats }) => {
  if (!stats) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">Loading storage statistics...</Typography>
      </Box>
    );
  }

  const { storage, usage } = stats;

  const calculatePercentage = (value, total) => {
    if (!total) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Storage Details
      </Typography>

      <Grid container spacing={3}>
        {/* Storage Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <StorageIcon color="primary" sx={{ fontSize: 40 }} />
                <Box flexGrow={1}>
                  <Typography variant="h6">Total Storage</Typography>
                  <Typography variant="h4" color="primary">
                    {storage?.total?.sizeMB || 0} MB
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2} mt={3}>
                {/* Used Storage */}
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Used Storage</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {storage?.used?.sizeMB || 0} MB ({storage?.used?.percentage || 0}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(storage?.used?.percentage || 0)}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {storage?.used?.count || 0} files in use
                  </Typography>
                </Box>

                {/* Unused Storage */}
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Unused Storage</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {storage?.unused?.sizeMB || 0} MB ({storage?.unused?.percentage || 0}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(storage?.unused?.percentage || 0)}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {storage?.unused?.count || 0} unused files
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <FileIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">File Usage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distribution of media files
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2}>
                {/* Total Files */}
                <Paper sx={{ p: 2 }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Total Files</Typography>
                    <Chip label={usage?.total || 0} color="primary" />
                  </Box>
                </Paper>

                {/* Used Files */}
                <Paper sx={{ p: 2 }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">Used in Content</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {calculatePercentage(usage?.used, usage?.total)}% of total
                      </Typography>
                    </Box>
                    <Chip label={usage?.used || 0} color="success" />
                  </Box>
                </Paper>

                {/* Unused Files */}
                <Paper sx={{ p: 2 }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">Unused Files</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {calculatePercentage(usage?.unused, usage?.total)}% of total
                      </Typography>
                    </Box>
                    <Chip label={usage?.unused || 0} color="warning" />
                  </Box>
                </Paper>

                {/* Deleted Files */}
                <Paper sx={{ p: 2 }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">Deleted Files</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Soft deleted (can be recovered)
                      </Typography>
                    </Box>
                    <Chip label={usage?.deleted || 0} />
                  </Box>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Rate Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Media Usage Efficiency
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">
                    Overall Usage Rate
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {usage?.usageRate || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseFloat(usage?.usageRate || 0)}
                  color={
                    usage?.usageRate >= 80
                      ? 'success'
                      : usage?.usageRate >= 60
                        ? 'primary'
                        : 'warning'
                  }
                  sx={{ height: 12, borderRadius: 6 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {usage?.usageRate >= 80
                    ? 'Excellent! Most of your media files are being used.'
                    : usage?.usageRate >= 60
                      ? 'Good usage rate. Consider cleaning up unused files.'
                      : 'Low usage rate. Many files are not being used in content.'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Optimization Tips */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'info.lighter' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              💡 Storage Optimization Tips
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {storage?.unused?.count > 0 && (
                <Typography variant="body2">
                  • You have <strong>{storage.unused.count}</strong> unused files taking up{' '}
                  <strong>{storage.unused.sizeMB} MB</strong>. Consider using the Orphaned Media
                  tool to clean them up.
                </Typography>
              )}
              {usage?.usageRate < 60 && (
                <Typography variant="body2">
                  • Your usage rate is below 60%. Review unused files regularly to keep your media
                  library organized.
                </Typography>
              )}
              {usage?.deleted > 0 && (
                <Typography variant="body2">
                  • You have <strong>{usage.deleted}</strong> soft-deleted files. These can be
                  permanently removed to free up space.
                </Typography>
              )}
              {usage?.usageRate >= 80 && (
                <Typography variant="body2">
                  • Great job! Your media library is well-maintained with a high usage rate.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MediaStorageStats;
