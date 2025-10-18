import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Schedule as ScheduleIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AccountSettings = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    email: '',
    fullName: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordRequirements, setPasswordRequirements] = useState([]);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        fullName: user.fullName || ''
      });
    }
  }, [user]);

  // Load password requirements
  useEffect(() => {
    const loadPasswordRequirements = async () => {
      try {
        const response = await api.get('/password/requirements');
        setPasswordRequirements(response.data.requirements || []);
      } catch (error) {
        console.error('Failed to load password requirements:', error);
      }
    };
    loadPasswordRequirements();
  }, []);

  const handleProfileChange = (field) => (event) => {
    setProfileData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!profileData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateProfile()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/account/profile', {
        email: profileData.email.trim(),
        fullName: profileData.fullName.trim()
      });

      // Update user context with new data
      await login(localStorage.getItem('token'), response.data.user);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      
      // Handle specific field errors
      if (error.response?.status === 409) {
        setErrors({ email: 'This email is already in use' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/account/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      toast.success('Password changed successfully');
      setPasswordChangeOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Password change error:', error);
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      
      // Handle specific field errors
      if (error.response?.data?.message?.includes('Current password')) {
        setErrors({ currentPassword: error.response.data.message });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      // Format as: "Oct 18, 2025 at 10:30 AM"
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' at ' + dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const formatMemberSince = (date) => {
    if (!date) return 'Unknown';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      // Format as: "October 2025" or "Oct 18, 2025" 
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const checkPasswordRequirement = (requirement, password) => {
    // Clean up the requirement text and check against password
    const cleanReq = requirement.toLowerCase().trim();
    
    if (cleanReq.includes('12') && cleanReq.includes('character')) {
      return password.length >= 12;
    }
    if (cleanReq.includes('uppercase')) {
      return /[A-Z]/.test(password);
    }
    if (cleanReq.includes('lowercase')) {
      return /[a-z]/.test(password);
    }
    if (cleanReq.includes('number')) {
      return /\d/.test(password);
    }
    if (cleanReq.includes('special')) {
      return /[!@#$%^&*(),.?":{}|<>]/.test(password);
    }
    if (cleanReq.includes('repeating')) {
      return !/(.)\1{2,}/.test(password);
    }
    if (cleanReq.includes('sequential')) {
      // Basic check for common sequences
      const sequences = ['abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz', '123', '234', '345', '456', '567', '678', '789'];
      const lowerPassword = password.toLowerCase();
      return !sequences.some(seq => lowerPassword.includes(seq) || lowerPassword.includes(seq.split('').reverse().join('')));
    }
    
    // For requirements with "at least 3 of the following", check if at least 3 categories are met
    if (cleanReq.includes('at least 3')) {
      let categories = 0;
      if (/[A-Z]/.test(password)) categories++;
      if (/[a-z]/.test(password)) categories++;
      if (/\d/.test(password)) categories++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) categories++;
      return categories >= 3;
    }
    
    return true; // Default to true for unrecognized requirements
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Account Settings
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your personal information and account security settings.
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2}>
            <CardHeader
              avatar={<PersonIcon color="primary" />}
              title="Profile Information"
              subheader="Update your personal information and contact details"
              sx={{ pb: 1 }}
            />
            <CardContent>
              <Box component="form" onSubmit={handleProfileSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={user.username}
                      disabled
                      helperText="Username cannot be changed"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange('email')}
                      error={!!errors.email}
                      helperText={errors.email || "Your primary email address"}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={profileData.fullName}
                      onChange={handleProfileChange('fullName')}
                      error={!!errors.fullName}
                      helperText={errors.fullName || "Your display name"}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading && <CircularProgress size={20} />}
                      size="large"
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Card elevation={2}>
              <CardHeader
                avatar={<BadgeIcon color="primary" />}
                title="Account Information"
                subheader="Your account details and status"
                sx={{ pb: 1 }}
              />
            <CardContent>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Username
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {user.username}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Role
                  </Typography>
                  <Chip 
                    label={user.role?.name ? user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1) : 'No role'}
                    color="primary"
                    variant="outlined"
                    size="medium"
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Account Status
                  </Typography>
                  <Chip 
                    label={user.isActive ? 'Active' : 'Inactive'}
                    color={user.isActive ? 'success' : 'error'}
                    variant={user.isActive ? 'filled' : 'outlined'}
                    size="medium"
                    icon={user.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Member Since
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatMemberSince(user.createdAt)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Last Login
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color={user.lastLogin ? 'text.primary' : 'text.secondary'}>
                    {formatDate(user.lastLogin)}
                  </Typography>
                </Box>

                {user.role?.privileges && user.role.privileges.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Privileges
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.role.privileges.length} permission{user.role.privileges.length !== 1 ? 's' : ''} granted
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card elevation={2}>
            <CardHeader
              avatar={<SecurityIcon color="primary" />}
              title="Security Settings"
              subheader="Manage your password and account security"
              sx={{ pb: 1 }}
            />
            <CardContent>
              <Button
                variant="outlined"
                startIcon={<VpnKeyIcon />}
                onClick={() => setPasswordChangeOpen(true)}
                fullWidth
                size="large"
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog 
        open={passwordChangeOpen} 
        onClose={() => setPasswordChangeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handlePasswordSubmit} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              margin="normal"
              required
            />

            {/* Password Requirements */}
            {passwordRequirements.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Password Requirements:
                </Typography>
                <List dense>
                  {passwordRequirements.map((requirement, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {checkPasswordRequirement(requirement, passwordData.newPassword) ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <CancelIcon color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={requirement}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontSize: '0.875rem',
                            color: checkPasswordRequirement(requirement, passwordData.newPassword) 
                              ? 'success.main' 
                              : 'text.secondary'
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordChangeOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={passwordLoading}
            startIcon={passwordLoading && <CircularProgress size={20} />}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountSettings;