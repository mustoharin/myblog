import React, { useState, useEffect, useCallback } from 'react';
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
  VpnKey as RoleIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

// Column width constants
const COLUMN_WIDTHS = {
  username: '20%',
  email: '25%',
  role: '15%',
  status: '10%',
  dates: '20%',
  actions: '10%',
};

const UserList = ({ onEdit }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      
      if (response.data.items && response.data.pagination) {
        setUsers(response.data.items);
        setTotalUsers(response.data.pagination.totalItems);
      } else {
        console.error('Unexpected response format:', response.data);
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, fetchUsers]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/users/${userToDelete._id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLastLoginDisplay = (lastLogin) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffMs = now - loginDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time if recent
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // Otherwise show formatted date
    return formatDateTime(lastLogin);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        sx={{ 
          width: '100%', 
          mb: 2, 
          overflow: 'hidden',
          borderRadius: 1,
          boxShadow: (theme) => theme.shadows[2]
        }}
      >
        {loading && <LinearProgress />}
        
        <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small" aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell width={COLUMN_WIDTHS.username}>
                  <Typography variant="subtitle2" fontWeight="bold">Username</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.email}>
                  <Typography variant="subtitle2" fontWeight="bold">Email</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.role}>
                  <Typography variant="subtitle2" fontWeight="bold">Role</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.status}>
                  <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.dates}>
                  <Typography variant="subtitle2" fontWeight="bold">Dates</Typography>
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
                    <TableCell><Skeleton animation="wave" /></TableCell>
                    <TableCell><Skeleton animation="wave" width={100} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" /></TableCell>
                    <TableCell><Skeleton animation="wave" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow 
                    key={user._id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={user.role.description || ''} arrow>
                        <Chip
                          icon={<RoleIcon />}
                          label={user.role.name}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ minWidth: 80 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(user.createdAt)}
                        </Typography>
                        <Tooltip 
                          title={user.lastLogin ? formatDateTime(user.lastLogin) : 'User has never logged in'} 
                          arrow
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                            Last Login: {getLastLoginDisplay(user.lastLogin)}
                          </Typography>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Edit" arrow>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onEdit(user)}
                              disabled={user.username === 'admin'}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.username === 'admin'}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8 }}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Users Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start adding new users to see them listed here.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Delete User</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user "{userToDelete?.username}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserList;