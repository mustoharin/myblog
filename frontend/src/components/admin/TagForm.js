import { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const TagForm = ({ tag, onTagSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    color: '#1976d2',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [namePreview, setNamePreview] = useState('');

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name,
        displayName: tag.displayName,
        description: tag.description || '',
        color: tag.color,
        isActive: tag.isActive,
      });
      setNamePreview(tag.name);
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        color: '#1976d2',
        isActive: true,
      });
      setNamePreview('');
    }
  }, [tag]);

  const formatTagName = input => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate tag name from display name
    if (field === 'displayName') {
      const generatedName = formatTagName(value);
      setNamePreview(generatedName);
      if (!tag) { // Only auto-update name for new tags
        setFormData(prev => ({
          ...prev,
          name: generatedName,
        }));
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!formData.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    const finalName = tag ? tag.name : namePreview;
    if (!finalName) {
      toast.error('Invalid tag name generated');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: finalName,
        displayName: formData.displayName.trim(),
        description: formData.description.trim() || undefined,
      };

      if (tag) {
        await api.put(`/tags/${tag._id}`, payload);
        toast.success('Tag updated successfully');
      } else {
        await api.post('/tags', payload);
        toast.success('Tag created successfully');
      }
      
      onTagSaved();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error(error.response?.data?.message || 'Failed to save tag');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (tag) {
      setFormData({
        name: tag.name,
        displayName: tag.displayName,
        description: tag.description || '',
        color: tag.color,
        isActive: tag.isActive,
      });
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        color: '#1976d2',
        isActive: true,
      });
      setNamePreview('');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {tag ? 'Edit Tag' : 'Create New Tag'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <TextField
                label="Display Name"
                value={formData.displayName}
                onChange={e => handleChange('displayName', e.target.value)}
                required
                fullWidth
                helperText="The name shown to users (e.g., 'JavaScript', 'Web Development')"
              />

              {!tag && (
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Generated tag name:
                  </Typography>
                  <Chip 
                    label={namePreview || 'will-be-generated'} 
                    variant="outlined"
                    size="small"
                  />
                </Box>
              )}

              {tag && (
                <TextField
                  label="Internal Name"
                  value={formData.name}
                  disabled
                  fullWidth
                  helperText="The internal name cannot be changed after creation"
                />
              )}

              <TextField
                label="Description"
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                multiline
                rows={3}
                fullWidth
                helperText="Optional description for internal reference (max 200 characters)"
                inputProps={{ maxLength: 200 }}
              />

              <FormControlLabel
                control={(
                  <Switch
                    checked={formData.isActive}
                    onChange={e => handleChange('isActive', e.target.checked)}
                  />
                )}
                label="Active"
                helperText="Inactive tags won't be suggested when creating posts"
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Tag Color
              </Typography>
              <Box sx={{ mb: 2 }}>
                <HexColorPicker
                  color={formData.color}
                  onChange={color => handleChange('color', color)}
                  style={{ width: '100%', height: '150px' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={formData.color}
                  onChange={e => handleChange('color', e.target.value)}
                  size="small"
                  inputProps={{ pattern: '^#[0-9A-Fa-f]{6}$' }}
                />
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: formData.color,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Preview:
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={formData.displayName || 'Tag Name'}
                  size="small"
                  sx={{
                    backgroundColor: `${formData.color}20`,
                    color: formData.color,
                    border: `1px solid ${formData.color}40`,
                  }}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Tip:</strong> Choose meaningful display names and colors to help users 
                quickly identify and organize content by topics.
              </Typography>
            </Alert>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !formData.displayName.trim()}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {tag ? 'Update Tag' : 'Create Tag'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default TagForm;