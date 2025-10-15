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
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

// Column width constants
const COLUMN_WIDTHS = {
  name: '20%',
  description: '30%',
  privileges: '30%',
  users: '10%',
  actions: '10%',
};

const RoleList = ({ onEdit }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRoles, setTotalRoles] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

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

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
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

  const formatPrivileges = (privileges) => {
    if (!privileges || privileges.length === 0) return [];
    
    // Group privileges by resource
    const grouped = privileges.reduce((acc, priv) => {
      const [resource] = priv.name.split('.');
      if (!acc[resource]) acc[resource] = [];
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
          boxShadow: (theme) => theme.shadows[2]
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
                <TableCell width={COLUMN_WIDTHS.privileges}>
                  <Typography variant="subtitle2" fontWeight="bold">Privileges</Typography>
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
                    <TableCell><Skeleton animation="wave" /></TableCell>
                    <TableCell><Skeleton animation="wave" width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : roles && roles.length > 0 ? (
                roles.map((role) => {
                  const groupedPrivileges = formatPrivileges(role.privileges);
                  
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
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {groupedPrivileges.map(({ resource, count, privileges }) => (
                            <Tooltip
                              key={resource}
                              title={
                                <Stack spacing={0.5}>
                                  {privileges.map(p => (
                                    <Typography key={p.name} variant="caption">
                                      {p.name}
                                    </Typography>
                                  ))}
                                </Stack>
                              }
                              arrow
                            >
                              <Chip
                                size="small"
                                label={`${resource} (${count})`}
                                variant="outlined"
                                sx={{ m: 0.25 }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
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
                          <Tooltip title="Edit" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => onEdit(role)}
                                disabled={role.name === 'admin'}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(role)}
                                disabled={role.name === 'admin'}
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
                  <TableCell colSpan={5} sx={{ py: 8 }}>
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
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
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
          <Typography variant="h6">Delete Role</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role "{roleToDelete?.name}"?
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