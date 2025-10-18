import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Skeleton,
  Alert,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';

const MODULE_ICONS = {
  authentication: <SecurityIcon />,
  user_management: <GroupIcon />,
  role_management: <AssignmentIcon />,
  content_management: <EditIcon />,
  comment_management: <EditIcon />,
  system_administration: <SecurityIcon />,
};

const validationSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .max(50, 'Name must be at most 50 characters'),
  description: yup
    .string()
    .required('Description is required')
    .max(200, 'Description must be at most 200 characters'),
  code: yup
    .string()
    .required('Code is required')
    .matches(/^[a-z_]+$/, 'Code must contain only lowercase letters and underscores')
    .max(30, 'Code must be at most 30 characters'),
  module: yup
    .string()
    .required('Module is required'),
  priority: yup
    .number()
    .min(0, 'Priority must be at least 0')
    .max(100, 'Priority must be at most 100'),
});

const PrivilegeManager = () => {
  const [groupedPrivileges, setGroupedPrivileges] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPrivilege, setEditingPrivilege] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [privilegeToDelete, setPrivilegeToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [privilegesResponse, modulesResponse] = await Promise.all([
        api.get('/privileges?grouped=true'),
        api.get('/privileges/modules'),
      ]);
      
      setGroupedPrivileges(privilegesResponse.data.modules || []);
      setModules(modulesResponse.data.modules || []);
    } catch (error) {
      console.error('Failed to fetch privileges:', error);
      toast.error('Failed to load privileges');
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      code: '',
      module: '',
      priority: 0,
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const moduleInfo = modules.find(m => m.code === values.module);
        const payload = {
          ...values,
          moduleDisplayName: moduleInfo?.name,
        };

        if (editingPrivilege) {
          await api.put(`/privileges/${editingPrivilege._id}`, payload);
          toast.success('Privilege updated successfully');
        } else {
          await api.post('/privileges', payload);
          toast.success('Privilege created successfully');
        }
        
        resetForm();
        setCreateDialogOpen(false);
        setEditingPrivilege(null);
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to save privilege');
      }
    },
  });

  const handleEdit = privilege => {
    setEditingPrivilege(privilege);
    formik.setValues({
      name: privilege.name,
      description: privilege.description,
      code: privilege.code,
      module: privilege.module,
      priority: privilege.priority || 0,
    });
    setCreateDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/privileges/${privilegeToDelete._id}`);
      toast.success('Privilege deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete privilege');
    } finally {
      setDeleteDialogOpen(false);
      setPrivilegeToDelete(null);
    }
  };

  const handleCreateNew = () => {
    setEditingPrivilege(null);
    formik.resetForm();
    setCreateDialogOpen(true);
  };

  const handleAccordionChange = moduleCode => (event, isExpanded) => {
    setExpandedModule(isExpanded ? moduleCode : null);
  };

  const getPriorityColor = priority => {
    if (priority >= 80) return 'error';
    if (priority >= 60) return 'warning';
    if (priority >= 40) return 'info';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Privilege Management
        </Typography>
        {[...Array(3)].map((_, index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="30%" height={32} />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="rectangular" height={100} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Privilege Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system privileges organized by functional modules
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create Privilege
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Privileges are organized by modules for better management. Each privilege has a priority that determines its importance within the module.
      </Alert>

      {groupedPrivileges.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No privileges found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first privilege to get started.
          </Typography>
        </Paper>
      ) : (
        groupedPrivileges.map(moduleGroup => (
          <Accordion
            key={moduleGroup.module}
            expanded={expandedModule === moduleGroup.module}
            onChange={handleAccordionChange(moduleGroup.module)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor: 'action.hover',
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                {MODULE_ICONS[moduleGroup.module] || <SecurityIcon />}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    {moduleGroup.moduleDisplayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {moduleGroup.count} privilege{moduleGroup.count !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Chip
                  label={moduleGroup.count}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Priority</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {moduleGroup.privileges
                      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                      .map(privilege => (
                        <TableRow key={privilege._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {privilege.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                            >
                              {privilege.code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {privilege.description}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={privilege.priority || 0}
                              size="small"
                              color={getPriorityColor(privilege.priority || 0)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="Edit Privilege">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(privilege)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Privilege">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setPrivilegeToDelete(privilege);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingPrivilege(null);
          formik.resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPrivilege ? 'Edit Privilege' : 'Create New Privilege'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Privilege Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="code"
                  name="code"
                  label="Privilege Code"
                  value={formik.values.code}
                  onChange={formik.handleChange}
                  error={formik.touched.code && Boolean(formik.errors.code)}
                  helperText={formik.touched.code && formik.errors.code}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <FormControl fullWidth>
                  <InputLabel>Module</InputLabel>
                  <Select
                    id="module"
                    name="module"
                    value={formik.values.module}
                    label="Module"
                    onChange={formik.handleChange}
                    error={formik.touched.module && Boolean(formik.errors.module)}
                  >
                    {modules.map(module => (
                      <MenuItem key={module.code} value={module.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {MODULE_ICONS[module.code] || <SecurityIcon />}
                          <Box>
                            <Typography>{module.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {module.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  id="priority"
                  name="priority"
                  label="Priority (0-100)"
                  value={formik.values.priority}
                  onChange={formik.handleChange}
                  error={formik.touched.priority && Boolean(formik.errors.priority)}
                  helperText={formik.touched.priority && formik.errors.priority}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingPrivilege(null);
                formik.resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {editingPrivilege ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Privilege</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the privilege &quot;{privilegeToDelete?.name}&quot;?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivilegeManager;