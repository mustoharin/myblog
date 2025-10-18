import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  VisibilityOff as DraftIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { createSafeHTML } from '../../utils/htmlSanitizer';
import TagInput from './TagInput';

// Constants
const AUTO_SAVE_DELAY = 3000; // 3 seconds
const MAX_TITLE_LENGTH = 200;
const MAX_EXCERPT_LENGTH = 500;

const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .trim()
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
  content: Yup.string()
    .required('Content is required')
    .trim(),
  excerpt: Yup.string()
    .required('Excerpt is required')
    .trim()
    .max(MAX_EXCERPT_LENGTH, `Excerpt must be at most ${MAX_EXCERPT_LENGTH} characters`),
  tags: Yup.string()
    .test('tags-validation', 'Each tag must be less than 50 characters', value => {
      if (!value) return true;
      const tags = value.split(',').map(tag => tag.trim());
      return tags.every(tag => tag.length <= 50);
    }),
  isPublished: Yup.boolean(),
});

const PostForm = ({ onBack }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingPost, setFetchingPost] = useState(!!id);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeTab, setActiveTab] = useState('edit');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [post, setPost] = useState(null);

  // Fetch post data if editing
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setFetchingPost(true);
        const response = await api.get(`/posts/${id}`);
        setPost(response.data);
      } catch (error) {
        toast.error('Failed to fetch post');
        navigate('/admin/posts');
      } finally {
        setFetchingPost(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, navigate]);

  const initialValues = {
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    isPublished: post?.isPublished ?? false,
    tags: Array.isArray(post?.tags) ? post.tags.join(', ') : '',
  };

  const handleSubmit = async values => {
    setLoading(true);
    try {
      // Process tags: split by comma, trim whitespace, remove empty tags, and remove duplicates
      const processedTags = values.tags
        ? [...new Set(values.tags.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0))]
        : [];

      const formData = {
        title: values.title.trim(),
        content: values.content.trim(),
        excerpt: values.excerpt.trim(),
        isPublished: values.isPublished,
        tags: processedTags,
      };

      if (post) {
        await api.put(`/posts/${post._id}`, formData);
        toast.success('Post updated successfully');
      } else {
        await api.post('/posts', formData);
        toast.success('Post created successfully');
      }
      navigate('/admin/posts');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: handleSubmit,
    enableReinitialize: true, // This allows formik to reset when post data is loaded
  });

  // Auto-save functionality
  useEffect(() => {
    if (!post || !hasUnsavedChanges) return;

    const timer = setTimeout(async () => {
      try {
        setAutoSaving(true);
        await handleSave(formik.values, true);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [formik.values, hasUnsavedChanges]);

  // Track changes
  useEffect(() => {
    if (JSON.stringify(formik.values) !== JSON.stringify(initialValues)) {
      setHasUnsavedChanges(true);
    }
  }, [formik.values, initialValues]);

  const handleSave = async (values, isAutoSave = false) => {
    if (!post) return; // Only for existing posts

    const processedTags = values.tags
      ? [...new Set(values.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0))]
      : [];

    const formData = {
      title: values.title.trim(),
      content: values.content.trim(),
      excerpt: values.excerpt.trim(),
      isPublished: values.isPublished,
      tags: processedTags,
    };

    try {
      await api.put(`/posts/${post._id}`, formData);
      if (!isAutoSave) {
        toast.success('Post saved successfully');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      if (!isAutoSave) {
        toast.error(error.response?.data?.message || 'Failed to save post');
      }
      throw error;
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Show loading spinner while fetching post data
  if (fetchingPost) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Unsaved changes warning */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          p: 1,
          textAlign: 'center',
          zIndex: 1100,
          display: hasUnsavedChanges ? 'block' : 'none',
        }}
      >
        <Typography>You have unsaved changes</Typography>
      </Box>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    onBack();
                  }
                } else {
                  onBack();
                }
              }}
            >
              Back
            </Button>
          </Grid>
          <Grid item xs>
            <Typography variant="h4">
              {post ? 'Edit Post' : 'Create New Post'}
            </Typography>
          </Grid>
          <Grid item>
            {autoSaving && <LinearProgress sx={{ width: 100 }} />}
            {lastSaved && !autoSaving && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Edit" value="edit" />
          <Tab label="Preview" value="preview" />
        </Tabs>

        {activeTab === 'edit' ? (
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Title"
                  value={formik.values.title}
                  onChange={e => {
                    if (e.target.value.length <= MAX_TITLE_LENGTH) {
                      formik.handleChange(e);
                    }
                  }}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={
                    (formik.touched.title && formik.errors.title) ||
                  `${formik.values.title.length}/${MAX_TITLE_LENGTH} characters`
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="excerpt"
                  name="excerpt"
                  label="Excerpt"
                  multiline
                  rows={3}
                  value={formik.values.excerpt}
                  onChange={e => {
                    if (e.target.value.length <= MAX_EXCERPT_LENGTH) {
                      formik.handleChange(e);
                    }
                  }}
                  error={formik.touched.excerpt && Boolean(formik.errors.excerpt)}
                  helperText={
                    (formik.touched.excerpt && formik.errors.excerpt) ||
                  `${formik.values.excerpt.length}/${MAX_EXCERPT_LENGTH} characters - A brief summary of the post that will appear in the blog list`
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TagInput
                  value={formik.values.tags}
                  onChange={newValue => formik.setFieldValue('tags', newValue)}
                  error={formik.touched.tags && Boolean(formik.errors.tags)}
                  helperText={formik.touched.tags && formik.errors.tags}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formik.values.isPublished}
                      onChange={e => formik.setFieldValue('isPublished', e.target.checked)}
                      color="success"
                    />
                  )}
                  label={(
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {formik.values.isPublished ? (
                        <PublishIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <DraftIcon color="action" sx={{ mr: 1 }} />
                      )}
                      <Typography>
                        {formik.values.isPublished ? 'Published' : 'Draft'}
                      </Typography>
                    </Box>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Content
                </Typography>
                <ReactQuill
                  value={formik.values.content}
                  onChange={content => formik.setFieldValue('content', content)}
                  style={{ height: '400px', marginBottom: '50px' }}
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link', 'image', 'code-block'],
                      ['clean'],
                    ],
                  }}
                />
                {formik.touched.content && formik.errors.content && (
                  <Typography color="error" variant="caption">
                    {formik.errors.content}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                          onBack();
                        }
                      } else {
                        onBack();
                      }
                    }}
                    disabled={loading}
                  >
                  Cancel
                  </Button>
                  {post && (
                    <Button
                      startIcon={<SaveIcon />}
                      onClick={() => handleSave(formik.values)}
                      disabled={loading || !hasUnsavedChanges}
                    >
                    Save
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={formik.values.isPublished ? <PublishIcon /> : <SaveIcon />}
                  >
                    {loading ? 'Saving...' : (post ? 'Update' : 'Create')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        ) : (
          <Box className="blog-preview">
            <Typography variant="h3" gutterBottom>
              {formik.values.title}
            </Typography>
            {formik.values.tags && (
              <Box sx={{ mb: 3 }}>
                {formik.values.tags.split(',').map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag.trim()}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              {formik.values.excerpt}
            </Typography>
            <Box
              dangerouslySetInnerHTML={createSafeHTML(formik.values.content)}
              sx={{
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                },
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 3,
                  mb: 2,
                },
                '& p': {
                  mb: 2,
                  lineHeight: 1.7,
                },
                '& blockquote': {
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  pl: 2,
                  py: 1,
                  my: 2,
                  bgcolor: 'action.hover',
                },
                '& pre': {
                  bgcolor: 'grey.900',
                  color: 'common.white',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                },
                '& code': {
                  bgcolor: 'action.hover',
                  px: 1,
                  borderRadius: 0.5,
                },
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PostForm;