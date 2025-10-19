import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Pagination,
  Avatar,
  Menu,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Block as RejectIcon,
  Report as SpamIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';

const CommentManagement = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 10,
    search: '',
  });
  const [selectedComment, setSelectedComment] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [stats, setStats] = useState(null);

  const statusOptions = [
    { value: '', label: 'All Comments' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'spam', label: 'Spam' },
  ];

  const statusColors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    spam: 'error',
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comments/admin/all', {
        params: {
          ...filters,
          search: filters.search || undefined,
        },
      });

      setComments(response.data.comments);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/comments/admin/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleModerateComment = async (commentId, status) => {
    try {
      await api.patch(`/comments/${commentId}/status`, { status });
      await fetchComments();
      await fetchStats();
      setActionMenuAnchor(null);
    } catch (err) {
      setError('Failed to moderate comment');
    }
  };

  const handleDeleteComment = async commentId => {
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      try {
        await api.delete(`/comments/${commentId}`);
        await fetchComments();
        await fetchStats();
        setActionMenuAnchor(null);
      } catch (err) {
        setError('Failed to delete comment');
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (event, newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const toggleCommentExpansion = commentId => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const openActionMenu = (event, comment) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedComment(comment);
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    // Don't clear selectedComment here - let the dialog handle it
  };

  const openViewDialog = () => {
    setViewDialogOpen(true);
    closeActionMenu();
  };

  const getAuthorDisplay = comment => {
    if (!comment || !comment.author) {
      return {
        name: 'Unknown Author',
        email: 'unknown@email.com',
        isRegistered: false,
      };
    }
    
    if (comment.author.user) {
      return {
        name: comment.author.user.fullName || comment.author.user.username,
        email: comment.author.user.email,
        isRegistered: true,
      };
    }
    return {
      name: comment.author.name,
      email: comment.author.email,
      website: comment.author.website,
      isRegistered: false,
    };
  };

  const truncateContent = (content, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  useEffect(() => {
    fetchComments();
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Comment Management
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Comments
              </Typography>
              <Typography variant="h4">
                {stats?.total || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats?.pending || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Approved
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats?.approved || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Recent (24h)
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats?.recent24h || 0}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search"
              placeholder="Search comments, authors, emails..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              sx={{ flexGrow: 1 }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Comments Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Author</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Post</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      No comments found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                comments.map(comment => {
                  const author = getAuthorDisplay(comment);
                  const isExpanded = expandedComments.has(comment._id);
                  
                  return (
                    <TableRow key={comment._id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {author.isRegistered ? (
                              author.name.charAt(0).toUpperCase()
                            ) : (
                              <PersonIcon />
                            )}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {author.name}
                              {author.isRegistered && (
                                <Chip 
                                  label="User" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ ml: 0.5, fontSize: '0.7rem' }}
                                />
                              )}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {author.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 300 }}>
                        <Box>
                          <Typography variant="body2">
                            {isExpanded ? comment.content : truncateContent(comment.content)}
                          </Typography>
                          {comment.content.length > 100 && (
                            <Button
                              size="small"
                              onClick={() => toggleCommentExpansion(comment._id)}
                              endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            >
                              {isExpanded ? 'Show Less' : 'Show More'}
                            </Button>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {comment.post?.title || 'Unknown Post'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={comment.status}
                          color={statusColors[comment.status]}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          onClick={e => openActionMenu(e, comment)}
                          size="small"
                        >
                          <MoreIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={closeActionMenu}
      >
        <MenuItem onClick={() => openViewDialog()}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        {selectedComment?.status !== 'approved' && (
          <MenuItem 
            onClick={() => handleModerateComment(selectedComment._id, 'approved')}
            sx={{ color: 'success.main' }}
          >
            <ApproveIcon sx={{ mr: 1 }} />
            Approve
          </MenuItem>
        )}
        
        {selectedComment?.status !== 'rejected' && (
          <MenuItem 
            onClick={() => handleModerateComment(selectedComment._id, 'rejected')}
            sx={{ color: 'error.main' }}
          >
            <RejectIcon sx={{ mr: 1 }} />
            Reject
          </MenuItem>
        )}
        
        {selectedComment?.status !== 'spam' && (
          <MenuItem 
            onClick={() => handleModerateComment(selectedComment._id, 'spam')}
            sx={{ color: 'error.main' }}
          >
            <SpamIcon sx={{ mr: 1 }} />
            Mark as Spam
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => handleDeleteComment(selectedComment._id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* View Comment Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedComment(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Comment Details</DialogTitle>
        <DialogContent>
          {selectedComment && (() => {
            const authorInfo = getAuthorDisplay(selectedComment);
            return (
              <Box>
                {/* Author Information */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Author Information
                    </Typography>
                    
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon />
                        <Typography>
                          {authorInfo.name}
                          {authorInfo.isRegistered && (
                            <Chip label="Registered User" size="small" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                      </Stack>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailIcon />
                        <Typography>{authorInfo.email}</Typography>
                      </Stack>
                      
                      {authorInfo.website && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinkIcon />
                          <Typography>{authorInfo.website}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Comment Content */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Comment Content
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedComment.content}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Metadata */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Metadata
                    </Typography>
                    
                    <Stack spacing={1}>
                      <Typography>
                        <strong>Status:</strong>{' '}
                        <Chip 
                          label={selectedComment.status} 
                          color={statusColors[selectedComment.status]}
                          size="small"
                        />
                      </Typography>
                      
                      <Typography>
                        <strong>Posted:</strong>{' '}
                        {format(new Date(selectedComment.createdAt), 'PPP p')}
                      </Typography>
                      
                      <Typography>
                        <strong>Post:</strong> {selectedComment.post?.title}
                      </Typography>
                      
                      {selectedComment.parentComment && (
                        <Typography>
                          <strong>Reply to:</strong> Comment #{selectedComment.parentComment}
                        </Typography>
                      )}
                      
                      {selectedComment.ipAddress && (
                        <Typography>
                          <strong>IP Address:</strong> {selectedComment.ipAddress}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setViewDialogOpen(false);
              setSelectedComment(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommentManagement;