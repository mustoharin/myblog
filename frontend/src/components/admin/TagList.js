import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  TextField,
  Box,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';

const TagList = ({ onEditTag, onTagDeleted, refreshTrigger }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [page, rowsPerPage, orderBy, order, searchTerm, refreshTrigger]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tags', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: order === 'desc' ? `-${orderBy}` : orderBy,
          search: searchTerm || undefined
        }
      });
      
      setTags(response.data.items || []);
      setTotalCount(response.data.totalItems || 0);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;
    
    try {
      await api.delete(`/tags/${tagToDelete._id}`);
      toast.success('Tag deleted successfully');
      onTagDeleted();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
    } finally {
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const handleSyncCounts = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/tags/sync-counts');
      toast.success(response.data.message);
      fetchTags();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sync tag counts');
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading && tags.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with search and actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search tags..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Tooltip title="Sync post counts for all tags">
          <IconButton 
            onClick={handleSyncCounts} 
            disabled={syncing}
            color="primary"
          >
            {syncing ? <CircularProgress size={24} /> : <SyncIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tags table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'displayName'}
                    direction={orderBy === 'displayName' ? order : 'asc'}
                    onClick={() => handleRequestSort('displayName')}
                  >
                    Tag
                  </TableSortLabel>
                </TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === 'postCount'}
                    direction={orderBy === 'postCount' ? order : 'asc'}
                    onClick={() => handleRequestSort('postCount')}
                  >
                    Posts
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === 'isActive'}
                    direction={orderBy === 'isActive' ? order : 'asc'}
                    onClick={() => handleRequestSort('isActive')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleRequestSort('createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag._id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={tag.displayName}
                        size="small"
                        sx={{
                          backgroundColor: tag.color + '20',
                          color: tag.color,
                          border: `1px solid ${tag.color}40`
                        }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        ({tag.name})
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {tag.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={tag.postCount} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={tag.isActive ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      label={tag.isActive ? 'Active' : 'Inactive'}
                      color={tag.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(tag.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onEditTag(tag)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(tag)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {tags.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                      {searchTerm ? 'No tags found matching your search.' : 'No tags found. Create your first tag!'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Tag</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete the tag "{tagToDelete?.displayName}"?
          </Alert>
          <Typography variant="body2">
            This will remove the tag from the system, but posts will keep their tag references.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TagList;