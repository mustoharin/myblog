import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import api from '../../../services/api';

const OrphanedMediaManager = ({ onCleanup }) => {
  const [loading, setLoading] = useState(false);
  const [orphanedMedia, setOrphanedMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [graceDays, setGraceDays] = useState(30);
  const [dryRunResults, setDryRunResults] = useState(null);
  const [showDryRunDialog, setShowDryRunDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchOrphanedMedia();
    fetchStats();
  }, [graceDays]);

  const fetchOrphanedMedia = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/media/orphaned?graceDays=${graceDays}&limit=50`);
      setOrphanedMedia(response.data.orphanedMedia || []);
    } catch (err) {
      console.error('Failed to fetch orphaned media:', err);
      setError('Failed to load orphaned media. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/media/orphaned/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch orphaned stats:', err);
    }
  };

  const handleSelectAll = event => {
    if (event.target.checked) {
      setSelectedMedia(orphanedMedia.map(m => m._id));
    } else {
      setSelectedMedia([]);
    }
  };

  const handleSelectOne = mediaId => {
    setSelectedMedia(prev =>
      prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId],
    );
  };

  const handleDryRun = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/media/orphaned/cleanup', {
        graceDays,
        dryRun: true,
        mediaIds: selectedMedia.length > 0 ? selectedMedia : undefined,
      });
      setDryRunResults(response.data);
      setShowDryRunDialog(true);
    } catch (err) {
      console.error('Dry run failed:', err);
      setError(err.response?.data?.message || 'Dry run failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await api.post('/media/orphaned/cleanup', {
        graceDays,
        dryRun: false,
        mediaIds: selectedMedia.length > 0 ? selectedMedia : undefined,
      });
      
      setSuccess(
        `Successfully cleaned up ${response.data.deletedCount} orphaned file(s). ` +
        `Freed ${response.data.totalSizeMB} MB of storage.`,
      );
      setSelectedMedia([]);
      setShowConfirmDialog(false);
      
      // Refresh data
      await fetchOrphanedMedia();
      await fetchStats();
      if (onCleanup) onCleanup();
    } catch (err) {
      console.error('Cleanup failed:', err);
      setError(err.response?.data?.message || 'Cleanup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  const formatDate = date => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={{ xs: 2, md: 4 }} py={2}>
        <Typography variant="h5" sx={{ letterSpacing: 0.5 }}>Orphaned Media Files</Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchOrphanedMedia} disabled={loading} variant="outlined" sx={{ minWidth: 120 }}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ pl: { xs: 1, md: 3 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Box mb={3}>
          <Alert severity="info" icon={<InfoIcon />}>
            <AlertTitle>Orphaned Media Summary</AlertTitle>
            <Typography variant="body2">
              <strong>{stats.count}</strong> orphaned files totaling{' '}
              <strong>{stats.totalSizeMB} MB</strong>
              {stats.oldestOrphaned && (
                <>
                  {' '}
                  | Oldest orphaned: <strong>{formatDate(stats.oldestOrphaned)}</strong>
                </>
              )}
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Box sx={{ minWidth: 220, maxWidth: 300 }}>
              <TextField
                label="Grace Period (Days)"
                type="number"
                value={graceDays}
                onChange={e => setGraceDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                size="small"
                fullWidth
                helperText="Only show files orphaned for this many days"
              />
            </Box>

            <Box flexGrow={1} />

            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handleDryRun}
              disabled={loading || orphanedMedia.length === 0}
            >
              Preview Cleanup
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowConfirmDialog(true)}
              disabled={loading || orphanedMedia.length === 0}
            >
              Delete Orphaned ({selectedMedia.length || 'All'})
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Orphaned Media Table */}
      {loading && !orphanedMedia.length ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : orphanedMedia.length === 0 ? (
        <Alert severity="success">
          <AlertTitle>No Orphaned Media</AlertTitle>
          All media files are being used. Great job keeping your media library clean!
        </Alert>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedMedia.length === orphanedMedia.length}
                    indeterminate={
                      selectedMedia.length > 0 && selectedMedia.length < orphanedMedia.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Filename</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Orphaned Since</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orphanedMedia.map(media => (
                <TableRow
                  key={media._id}
                  hover
                  selected={selectedMedia.includes(media._id)}
                  onClick={() => handleSelectOne(media._id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedMedia.includes(media._id)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {media.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {media.folder}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatFileSize(media.size)}</TableCell>
                  <TableCell>{formatDate(media.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatDate(media.orphanedSince)}
                      size="small"
                      color="warning"
                      icon={<WarningIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={media.mimeType} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dry Run Dialog */}
      <Dialog
        open={showDryRunDialog}
        onClose={() => setShowDryRunDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cleanup Preview (Dry Run)</DialogTitle>
        <DialogContent>
          {dryRunResults && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Preview Results</AlertTitle>
                <Typography variant="body2">
                  <strong>{dryRunResults.summary?.count || 0}</strong> files would be deleted,
                  freeing <strong>{dryRunResults.summary?.totalSizeMB || 0} MB</strong> of storage.
                </Typography>
              </Alert>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Filename</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Orphaned Since</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dryRunResults.wouldDelete?.map(media => (
                      <TableRow key={media.id}>
                        <TableCell>{media.filename}</TableCell>
                        <TableCell>{media.size}</TableCell>
                        <TableCell>{formatDate(media.orphanedSince)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDryRunDialog(false)}>Close</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setShowDryRunDialog(false);
              setShowConfirmDialog(true);
            }}
          >
            Proceed with Cleanup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Cleanup Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm Cleanup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Warning: This action cannot be undone!</AlertTitle>
          </Alert>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>
              {selectedMedia.length > 0 ? `${selectedMedia.length} selected` : 'all'} orphaned
              file(s)
            </strong>
            ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Files orphaned for more than {graceDays} days will be permanently removed from storage.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCleanup}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
      </Grid>
    </Box>
  );
};

export default OrphanedMediaManager;
