import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Switch,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';

const validationSchema = Yup.object({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .when('isNew', {
      is: true,
      then: Yup.string().required('Password is required'),
    }),
  confirmPassword: Yup.string()
    .when('password', {
      is: (val) => val?.length > 0,
      then: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm password'),
    }),
});

const UserForm = ({ user, onBack }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data.roles);
    } catch (error) {
      toast.error('Failed to fetch roles');
    }
  };

  const initialValues = {
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    isActive: user?.isActive ?? true,
    roles: user?.roles?.map(role => role._id) || [],
    isNew: !user,
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const userData = {
        username: values.username,
        email: values.email,
        isActive: values.isActive,
        roles: values.roles,
      };

      if (values.password) {
        userData.password = values.password;
      }

      if (user) {
        await api.put(`/users/${user._id}`, userData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', userData);
        toast.success('User created successfully');
      }
      navigate('/admin/users');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
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
          {user ? 'Edit User' : 'Create New User'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="username"
                name="username"
                label="Username"
                value={formik.values.username}
                onChange={formik.handleChange}
                error={formik.touched.username && Boolean(formik.errors.username)}
                helperText={formik.touched.username && formik.errors.username}
                disabled={user?.username === 'admin'}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label={user ? "New Password (optional)" : "Password"}
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                disabled={!formik.values.password}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="roles-label">Roles</InputLabel>
                <Select
                  labelId="roles-label"
                  id="roles"
                  name="roles"
                  multiple
                  value={formik.values.roles}
                  onChange={formik.handleChange}
                  input={<OutlinedInput label="Roles" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((roleId) => {
                        const role = roles.find(r => r._id === roleId);
                        return role ? (
                          <Chip key={roleId} label={role.name} />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem
                      key={role._id}
                      value={role._id}
                      disabled={user?.username === 'admin' && role.name === 'admin'}
                    >
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={formik.values.isActive}
                    onChange={formik.handleChange}
                    disabled={user?.username === 'admin'}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
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
                  disabled={loading || (user?.username === 'admin' && !formik.values.password)}
                >
                  {loading ? 'Saving...' : (user ? 'Update' : 'Create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default UserForm;