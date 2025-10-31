import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  AlertTitle,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Grid,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import api from '../../../services/api';

const ContentValidation = () => {
  const [loading, setLoading] = useState(false);
  const [contentInput, setContentInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const handleValidateContent = async () => {
    if (!contentInput.trim()) return;

    try {
      setLoading(true);
      const response = await api.post('/posts/validate-media', {
        content: contentInput,
      });
      setValidationResult(response.data);
    } catch (err) {
      console.error('Validation failed:', err);
      setValidationResult({
        error: err.response?.data?.message || 'Validation failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      setLoadingHealth(true);
      const response = await api.get('/posts/system/media-health');
      setSystemHealth(response.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setSystemHealth({
        error: err.response?.data?.message || 'Health check failed. Please try again.',
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const getHealthColor = score => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getHealthLabel = score => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={{ xs: 2, md: 4 }} py={2}>
        <Typography variant="h5" sx={{ letterSpacing: 0.5 }}>
          Content Validation & Health Check
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ pl: { xs: 1, md: 3 } }}>
      {/* Content Validation Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Validate Post Content
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Paste post content (HTML) to check for broken or invalid media references.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder="<p>Enter your post content here...</p>"
            value={contentInput}
            onChange={e => setContentInput(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleValidateContent}
            disabled={loading || !contentInput.trim()}
          >
            {loading ? 'Validating...' : 'Validate Content'}
          </Button>

          {/* Validation Results */}
          {validationResult && !validationResult.error && (
            <Box mt={3}>
              <Alert
                severity={validationResult.isValid ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                <AlertTitle>
                  {validationResult.isValid ? 'Content is Valid' : 'Issues Found'}
                </AlertTitle>
                Found {validationResult.totalReferences} media reference(s) in content
              </Alert>

              <Stack spacing={2}>
                {/* Valid References */}
                {validationResult.valid?.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      <ValidIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Valid Media ({validationResult.valid.length})
                    </Typography>
                    <List dense>
                      {validationResult.valid.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={item.filename}
                            secondary={`Used ${item.usageCount} time(s)`}
                          />
                          <Chip label="Valid" color="success" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Invalid References */}
                {validationResult.invalid?.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      <ErrorIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Invalid Media ({validationResult.invalid.length})
                    </Typography>
                    <List dense>
                      {validationResult.invalid.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={item.url}
                            secondary={item.reason}
                          />
                          <Chip label="Not Found" color="error" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Deleted References */}
                {validationResult.deleted?.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      <ErrorIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Deleted Media ({validationResult.deleted.length})
                    </Typography>
                    <List dense>
                      {validationResult.deleted.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={item.filename}
                            secondary={`Deleted on ${new Date(item.deletedAt).toLocaleDateString()}`}
                          />
                          <Chip label="Deleted" color="error" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Orphaned References */}
                {validationResult.orphaned?.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      <WarningIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Orphaned Media ({validationResult.orphaned.length})
                    </Typography>
                    <List dense>
                      {validationResult.orphaned.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={item.filename}
                            secondary={`Orphaned since ${new Date(item.orphanedSince).toLocaleDateString()}`}
                          />
                          <Chip label="Orphaned" color="warning" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Stack>
            </Box>
          )}

          {validationResult?.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {validationResult.error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Health Check Section */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">System Media Health</Typography>
            <Button
              variant="outlined"
              startIcon={<HealthIcon />}
              onClick={checkSystemHealth}
              disabled={loadingHealth}
            >
              {loadingHealth ? 'Checking...' : 'Check Health'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            Run a comprehensive health check on all media references in your system.
          </Typography>

          {loadingHealth && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {systemHealth && !systemHealth.error && (
            <Box mt={3}>
              {/* Health Score */}
              <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
                <Typography variant="h3" color={`${getHealthColor(systemHealth.healthScore)}.main`}>
                  {systemHealth.healthScore}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Health Score - {getHealthLabel(systemHealth.healthScore)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.healthScore}
                  color={getHealthColor(systemHealth.healthScore)}
                  sx={{ mt: 2, height: 10, borderRadius: 5 }}
                />
              </Paper>

              {/* Media Statistics */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Media Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Media Files:</Typography>
                    <Chip label={systemHealth.media?.total || 0} size="small" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Active (In Use):</Typography>
                    <Chip label={systemHealth.media?.active || 0} color="success" size="small" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Orphaned:</Typography>
                    <Chip
                      label={systemHealth.media?.orphaned || 0}
                      color={systemHealth.media?.orphaned > 0 ? 'warning' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Deleted:</Typography>
                    <Chip label={systemHealth.media?.deleted || 0} size="small" />
                  </Box>
                </Stack>
              </Paper>

              {/* Posts Statistics */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Content Health
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Posts:</Typography>
                    <Chip label={systemHealth.posts?.total || 0} size="small" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Published Posts:</Typography>
                    <Chip label={systemHealth.posts?.published || 0} color="info" size="small" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Posts with Issues:</Typography>
                    <Chip
                      label={systemHealth.posts?.postsWithIssues || 0}
                      color={systemHealth.posts?.postsWithIssues > 0 ? 'error' : 'success'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Estimated Broken Posts:</Typography>
                    <Chip
                      label={systemHealth.posts?.estimatedBrokenPosts || 0}
                      color={systemHealth.posts?.estimatedBrokenPosts > 0 ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Broken References:</Typography>
                    <Chip
                      label={systemHealth.posts?.totalBrokenReferences || 0}
                      color={systemHealth.posts?.totalBrokenReferences > 0 ? 'error' : 'success'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>

              {systemHealth.posts?.postsWithIssues > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle>Action Required</AlertTitle>
                  Found {systemHealth.posts.postsWithIssues} post(s) with broken media references.
                  Consider reviewing and updating these posts.
                </Alert>
              )}
            </Box>
          )}

          {systemHealth?.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {systemHealth.error}
            </Alert>
          )}
        </CardContent>
      </Card>
      </Grid>
    </Box>
  );
};

export default ContentValidation;
