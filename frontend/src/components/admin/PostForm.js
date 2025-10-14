import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-toastify';
import api from '../../services/api';

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').max(200, 'Title must be at most 200 characters'),
  content: Yup.string().required('Content is required'),
  excerpt: Yup.string().required('Excerpt is required').max(500, 'Excerpt must be at most 500 characters'),
  tags: Yup.string(),
  isPublished: Yup.boolean()
});

const PostForm = ({ post, onBack }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    isPublished: post?.isPublished ?? false,
    tags: post?.tags?.join(', ') || '',
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const formData = {
        title: values.title,
        content: values.content,
        excerpt: values.excerpt,
        isPublished: values.isPublished,
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
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
  });

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Typography variant="h4">
          {post ? 'Edit Post' : 'Create New Post'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="title"
                name="title"
                label="Title"
                value={formik.values.title}
                onChange={formik.handleChange}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title}
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
                onChange={formik.handleChange}
                error={formik.touched.excerpt && Boolean(formik.errors.excerpt)}
                helperText={
                  (formik.touched.excerpt && formik.errors.excerpt) ||
                  'A brief summary of the post that will appear in the blog list'
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="tags"
                name="tags"
                label="Tags (comma separated)"
                value={formik.values.tags}
                onChange={formik.handleChange}
                helperText="Enter tags separated by commas"
              />
            </Grid>

            <Grid item xs={12}>
                            <FormControl>
                <Button
                  variant={formik.values.isPublished ? "contained" : "outlined"}
                  color={formik.values.isPublished ? "success" : "primary"}
                  onClick={() => formik.setFieldValue('isPublished', !formik.values.isPublished)}
                >
                  {formik.values.isPublished ? 'Published' : 'Draft'}
                </Button>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Content
              </Typography>
              <ReactQuill
                value={formik.values.content}
                onChange={(content) => formik.setFieldValue('content', content)}
                style={{ height: '300px', marginBottom: '50px' }}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, false] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'image'],
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
                  onClick={onBack}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (post ? 'Update' : 'Create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PostForm;