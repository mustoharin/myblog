import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Role name is required')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Role name can only contain letters, numbers, hyphens and underscores')
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be at most 50 characters'),
  description: Yup.string()
    .required('Description is required')
    .max(200, 'Description must be at most 200 characters'),
});

const RoleForm = ({ onBack }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingRole, setFetchingRole] = useState(!!id);
  const [availablePrivileges, setAvailablePrivileges] = useState([]);
  const [expandedResource, setExpandedResource] = useState(null);
  const [role, setRole] = useState(null);
  const [privilegeMap, setPrivilegeMap] = useState({}); // Map privilege names to IDs

  useEffect(() => {
    fetchAvailablePrivileges();
    if (id) {
      fetchRole();
    }
  }, [id]);

  const fetchRole = async () => {
    try {
      setFetchingRole(true);
      const response = await api.get(`/roles/${id}`);
      setRole(response.data);
    } catch (error) {
      toast.error('Failed to fetch role');
      navigate('/admin/roles');
    } finally {
      setFetchingRole(false);
    }
  };

  const fetchAvailablePrivileges = async () => {
    try {
      // Fetch all privileges without pagination (max 50 per backend limit)
      const response = await api.get('/privileges', {
        params: { limit: 50 }
      });
      // Backend returns paginated response with 'items' array
      const privilegesList = response.data.items || response.data.privileges || [];
      
      // Create a map of privilege names to IDs for later conversion
      const nameToIdMap = {};
      privilegesList.forEach(priv => {
        nameToIdMap[priv.name] = priv._id;
      });
      setPrivilegeMap(nameToIdMap);
      
      // Group privileges by resource
      const grouped = privilegesList.reduce((acc, priv) => {
        const [resource] = priv.name.split('.');
        if (!acc[resource]) {
          acc[resource] = {
            name: resource,
            privileges: [],
          };
        }
        acc[resource].privileges.push(priv);
        return acc;
      }, {});
      
      setAvailablePrivileges(Object.values(grouped));
    } catch (error) {
      console.error('Failed to fetch privileges:', error);
      toast.error('Failed to fetch privileges');
    }
  };

  const initialValues = {
    name: role?.name || '',
    description: role?.description || '',
    privileges: role?.privileges?.map(p => p.name) || [],
  };

  const handleSubmit = async (values) => {
    if (values.name.toLowerCase() === 'admin' && !role) {
      toast.error('Cannot create a role named "admin"');
      return;
    }

    setLoading(true);
    try {
      // Convert privilege names to IDs before sending to backend
      const privilegeIds = values.privileges.map(name => privilegeMap[name]).filter(Boolean);
      
      const payload = {
        name: values.name,
        description: values.description,
        privileges: privilegeIds
      };
      
      if (role) {
        await api.put(`/roles/${role._id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', payload);
        toast.success('Role created successfully');
      }
      navigate('/admin/roles');
    } catch (error) {
      console.error('Role submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: handleSubmit,
    enableReinitialize: true,
  });

  const handleResourcePrivilegesChange = (resourceName, checked, privileges) => {
    const currentPrivileges = new Set(formik.values.privileges);
    
    privileges.forEach(priv => {
      if (checked) {
        currentPrivileges.add(priv.name);
      } else {
        currentPrivileges.delete(priv.name);
      }
    });

    formik.setFieldValue('privileges', Array.from(currentPrivileges));
  };

  const isResourceChecked = (privileges) => {
    return privileges.every(priv => 
      formik.values.privileges.includes(priv.name)
    );
  };

  const isResourceIndeterminate = (privileges) => {
    const checkedCount = privileges.filter(priv => 
      formik.values.privileges.includes(priv.name)
    ).length;
    return checkedCount > 0 && checkedCount < privileges.length;
  };

  // Show loading spinner while fetching role data
  if (fetchingRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Typography variant="h4">
          {role ? 'Edit Role' : 'Create New Role'}
        </Typography>
      </Box>

      {role?.name === 'admin' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          The admin role's name and core privileges cannot be modified for security reasons.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="name"
                name="name"
                label="Role Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                disabled={role?.name === 'admin'}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="description"
                name="description"
                label="Description"
                value={formik.values.description}
                onChange={formik.handleChange}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Privileges
              </Typography>
              <Box>
                {availablePrivileges.map((resource) => (
                  <Accordion
                    key={resource.name}
                    expanded={expandedResource === resource.name}
                    onChange={() => setExpandedResource(
                      expandedResource === resource.name ? null : resource.name
                    )}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isResourceChecked(resource.privileges)}
                              indeterminate={isResourceIndeterminate(resource.privileges)}
                              onChange={(e) => handleResourcePrivilegesChange(
                                resource.name,
                                e.target.checked,
                                resource.privileges
                              )}
                              disabled={role?.name === 'admin'}
                            />
                          }
                          label={
                            <Typography sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {resource.name}
                            </Typography>
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </FormGroup>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Divider sx={{ mb: 2 }} />
                      <FormGroup>
                        {resource.privileges.map((privilege) => (
                          <FormControlLabel
                            key={privilege.name}
                            control={
                              <Checkbox
                                name="privileges"
                                value={privilege.name}
                                checked={formik.values.privileges.includes(privilege.name)}
                                onChange={formik.handleChange}
                                disabled={role?.name === 'admin'}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{privilege.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {privilege.description}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
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
                  disabled={loading || role?.name === 'admin'}
                >
                  {loading ? 'Saving...' : (role ? 'Update' : 'Create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default RoleForm;