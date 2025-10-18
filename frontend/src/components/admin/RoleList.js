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
  TablePagination,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tooltip,
  LinearProgress,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Column width constants
const COLUMN_WIDTHS = {
  name: '25%',
  description: '40%',
  users: '15%',
  actions: '20%',
};

const RoleList = ({ onEdit }) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRoles, setTotalRoles] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [roleToView, setRoleToView] = useState(null);

  // Check if current user can modify a specific role
  const canModifyRole = role => {
    if (!user?.role) return false;
    
    // Superadmin can modify all roles except itself (to prevent system lockout)
    if (user.role.name === 'superadmin') {
      return role.name !== 'superadmin';
    }
    
    // Admin cannot modify admin or superadmin roles
    if (user.role.name === 'admin' && ['admin', 'superadmin'].includes(role.name)) return false;
    
    // Other users cannot modify any roles by default
    return false;
  };

  // Check if current user can edit a specific role (more permissive than delete)
  const canEditRole = role => {
    if (!user?.role) return false;
    
    // Superadmin can edit all roles including itself
    if (user.role.name === 'superadmin') return true;
    
    // Admin cannot edit admin or superadmin roles
    if (user.role.name === 'admin' && ['admin', 'superadmin'].includes(role.name)) return false;
    
    // Other users cannot edit any roles by default
    return false;
  };

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get('/roles', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      
      if (response.data.items && response.data.pagination) {
        setRoles(response.data.items);
        setTotalRoles(response.data.pagination.totalItems);
      } else {
        console.error('Unexpected response format:', response.data);
        setRoles([]);
        setTotalRoles(0);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchRoles();
  }, [page, rowsPerPage]); // Fetch roles when page or rowsPerPage changes

  const handleDeleteClick = role => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleViewClick = role => {
    setRoleToView(role);
    setViewDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/roles/${roleToDelete._id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const formatPrivileges = privileges => {
    if (!privileges || privileges.length === 0) return [];
    
    // Group privileges by resource with safe object access
    const grouped = privileges.reduce((acc, priv) => {
      const [resource] = priv.name.split('.');
      // Validate that resource is a safe key before using it
      const validResources = ['posts', 'users', 'roles', 'tags', 'privileges', 'admin', 'account'];
      if (!validResources.includes(resource)) return acc;
      
      // eslint-disable-next-line security/detect-object-injection
      if (!acc[resource]) acc[resource] = [];
      // eslint-disable-next-line security/detect-object-injection
      acc[resource].push(priv);
      return acc;
    }, {});

    return Object.entries(grouped).map(([resource, privs]) => ({
      resource,
      count: privs.length,
      privileges: privs,
    }));
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
          <Table stickyHeader size="small" aria-label="roles table">
            <TableHead>
              <TableRow>
                <TableCell width={COLUMN_WIDTHS.name}>
                  <Typography variant="subtitle2" fontWeight="bold">Role Name</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.description}>
                  <Typography variant="subtitle2" fontWeight="bold">Description</Typography>
                </TableCell>
                <TableCell width={COLUMN_WIDTHS.users}>
                  <Typography variant="subtitle2" fontWeight="bold">Users</Typography>
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
                    <TableCell><Skeleton animation="wave" width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={120} /></TableCell>
                  </TableRow>
                ))
              ) : roles && roles.length > 0 ? (
                roles.map(role => {
                  return (
                    <TableRow 
                      key={role._id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SecurityIcon color="action" fontSize="small" />
                          <Typography variant="body2" fontWeight={500}>
                            {role.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {role.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip 
                          title={`${role.usersCount || 0} user${(role.usersCount || 0) !== 1 ? 's' : ''} assigned to this role`}
                          arrow
                        >
                          <Chip
                            label={role.usersCount || 0}
                            size="small"
                            color={role.usersCount > 0 ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ minWidth: 50, cursor: 'help' }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="View role details and privileges" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleViewClick(role)}
                              color="info"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={canEditRole(role) ? 'Edit' : "You don't have permission to edit this role"} arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => onEdit(role)}
                                disabled={!canEditRole(role)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={canModifyRole(role) ? 'Delete' : role.name === 'superadmin' ? 'Cannot delete superadmin role' : "You don't have permission to delete this role"} arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(role)}
                                disabled={!canModifyRole(role)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} sx={{ py: 8 }}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Roles Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start creating new roles to see them listed here.
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
          count={totalRoles}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={event => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      {/* Role Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon />
            <Typography variant="h6">Role Details: {roleToView?.name}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {roleToView && (
            <Stack spacing={3}>
              {/* Basic Information */}
              <Box>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{roleToView.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body1">{roleToView.description || 'No description'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Users Assigned</Typography>
                    <Chip
                      label={`${roleToView.usersCount || 0} user${(roleToView.usersCount || 0) !== 1 ? 's' : ''}`}
                      size="small"
                      color={roleToView.usersCount > 0 ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                </Stack>
              </Box>

              {/* Privileges */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Privileges ({roleToView.privileges?.length || 0})
                </Typography>
                {roleToView.privileges && roleToView.privileges.length > 0 ? (
                  <Stack spacing={2}>
                    {formatPrivileges(roleToView.privileges).map(({ resource, privileges }) => (
                      <Box key={resource}>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1, textTransform: 'capitalize' }}>
                          {resource.replace('_', ' ')} Module ({privileges.length} permission{privileges.length !== 1 ? 's' : ''})
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {privileges.map(privilege => (
                            <Chip
                              key={privilege.name}
                              label={privilege.name}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.75rem',
                                '& .MuiChip-label': { px: 1 },
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No privileges assigned to this role
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {roleToView && canEditRole(roleToView) && (
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                onEdit(roleToView);
              }}
            >
              Edit Role
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Delete Role</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;?
          </Typography>
          {roleToDelete?.usersCount > 0 && (
            <Typography color="error" sx={{ mt: 2 }}>
              Warning: This role is assigned to {roleToDelete.usersCount} user(s).
              These users will lose the permissions associated with this role.
            </Typography>
          )}
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

export default RoleList;