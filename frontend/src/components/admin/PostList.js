import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Skeleton,
  Tooltip,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

// Column width constants
const COLUMN_WIDTHS = {
  title: '40%',
  author: '20%',
  status: '15%',
  date: '15%',
  actions: '10%',
};

const PostList = ({ onEdit }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [totalPosts, setTotalPosts] = useState(0);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/posts', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      
      if (response.data.items && response.data.pagination) {
        setPosts(response.data.items);
        setTotalPosts(response.data.pagination.totalItems);
      } else {
        console.error('Unexpected response format:', response.data);
        setPosts([]);
        setTotalPosts(0);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = post => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    
    try {
      await api.delete(`/posts/${postToDelete._id}`);
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const formatDate = date => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        sx={{ 
          width: '100%', 
          mb: 2, 
          overflow: 'hidden',
          borderRadius: 1,
          boxShadow: theme => theme.shadows[2],
        }}
      >
        {loading && <LinearProgress />}
        
        <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small" aria-label="posts table">
            <TableHead>
              <TableRow>
                <TableCell width={COLUMN_WIDTHS.title}>
                  <Typography variant="subtitle2" fontWeight="bold">Title</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.author}>
                  <Typography variant="subtitle2" fontWeight="bold">Author</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.status}>
                  <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.date}>
                  <Typography variant="subtitle2" fontWeight="bold">Created</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.actions} align="center">
                  <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(rowsPerPage)].map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton animation="wave" /></TableCell>
                    <TableCell><Skeleton animation="wave" width={100} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={80} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : posts && posts.length > 0 ? (
                posts.map(post => (
                  <TableRow 
                    key={post._id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Tooltip title={post.title} arrow placement="top">
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {post.title}
                          </Typography>
                        </Tooltip>
                        {post.excerpt && (
                          <Tooltip title={post.excerpt} arrow placement="bottom">
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {post.excerpt}
                            </Typography>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{post.author?.username || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={post.isPublished ? 'Published' : 'Draft'}
                        color={post.isPublished ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(post.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="View" arrow>
                          <IconButton
                            size="small"
                            onClick={() => window.open(`/post/${post._id}`, '_blank')}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit" arrow>
                          <IconButton
                            size="small"
                            onClick={() => onEdit(post)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(post)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 8 }}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Posts Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start creating new blog posts to see them listed here.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalPosts}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this post?
            </Typography>
            {postToDelete && (
              <Typography variant="subtitle2" color="text.secondary">
                &quot;{postToDelete.title}&quot;
              </Typography>
            )}
          </Box>
          <Typography variant="body2" color="error">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            disableElevation
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PostList;