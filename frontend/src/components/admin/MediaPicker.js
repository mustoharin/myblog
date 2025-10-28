import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Image as ImageIcon,
  CloudUpload as UploadIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

/**
 * MediaPicker Component
 * Allows users to select media from the library or upload new files
 */
const MediaPicker = ({ open, onClose, onSelect, multiple = false }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(multiple ? [] : null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && activeTab === 0) {
      fetchMedia();
    }
  }, [open, activeTab]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await api.get('/media', {
        params: {
          limit: 50,
          sort: '-createdAt',
        },
      });
      // Backend returns { media: [...], pagination: {...} }
      const data = response.data.media || [];
      setMediaList(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load media library');
      console.error('Fetch media error:', error);
      setMediaList([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async event => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedMedia = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'posts');

        const response = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Backend returns { message: '...', media: {...} }
        if (response.data.media) {
          uploadedMedia.push(response.data.media);
        }
      }

      toast.success(`${uploadedMedia.length} file(s) uploaded successfully`);
      
      // Refresh media list
      await fetchMedia();
      
      // Auto-select uploaded media
      if (multiple) {
        setSelectedMedia(uploadedMedia);
      } else if (uploadedMedia.length > 0) {
        setSelectedMedia(uploadedMedia[0]);
      }
    } catch (error) {
      toast.error('Failed to upload file(s)');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaClick = media => {
    if (multiple) {
      setSelectedMedia(prev => {
        const isSelected = prev.some(m => m._id === media._id);
        if (isSelected) {
          return prev.filter(m => m._id !== media._id);
        }
        return [...prev, media];
      });
    } else {
      setSelectedMedia(media);
    }
  };

  const handleInsert = () => {
    if (multiple) {
      onSelect(selectedMedia);
    } else {
      onSelect(selectedMedia);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedMedia(multiple ? [] : null);
    setSearchQuery('');
    onClose();
  };

  // Ensure mediaList is always an array before filtering
  const filteredMedia = (Array.isArray(mediaList) ? mediaList : []).filter(media =>
    media.originalName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isSelected = media => {
    if (multiple) {
      return selectedMedia.some(m => m._id === media._id);
    }
    return selectedMedia?._id === media._id;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ImageIcon />
          Select Media
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Media Library" />
          <Tab label="Upload New" />
        </Tabs>

        {activeTab === 0 && (
          <>
            <TextField
              fullWidth
              placeholder="Search media..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : filteredMedia.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  {searchQuery ? 'No media found' : 'No media in library'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredMedia.map(media => (
                  <Grid item xs={6} sm={4} md={3} key={media._id}>
                    <Card
                      sx={{
                        position: 'relative',
                        border: isSelected(media) ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                    >
                      <CardActionArea onClick={() => handleMediaClick(media)}>
                        <CardMedia
                          component="img"
                          height="120"
                          image={media.url}
                          alt={media.originalName}
                          sx={{ objectFit: 'cover' }}
                        />
                        {isSelected(media) && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'primary.main',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CheckIcon sx={{ color: 'white', fontSize: 16 }} />
                          </Box>
                        )}
                      </CardActionArea>
                      <Box p={1}>
                        <Typography variant="caption" noWrap display="block">
                          {media.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(media.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {activeTab === 1 && (
          <Box textAlign="center" py={4}>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleUpload}
              style={{ display: 'none' }}
              id="media-upload-input"
            />
            <label htmlFor="media-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                disabled={uploading}
                size="large"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Supported formats: JPG, PNG, GIF, WebP
              <br />
              Max file size: 10MB
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleInsert}
          disabled={multiple ? selectedMedia.length === 0 : !selectedMedia}
          startIcon={<CheckIcon />}
        >
          Insert {multiple && selectedMedia.length > 0 && `(${selectedMedia.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaPicker;
