import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  PostAdd as PostIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tag as TagIcon,
  Security as RoleIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ACTIVITY_ICONS = {
  post_create: <PostIcon color="primary" />,
  post_update: <EditIcon color="primary" />,
  post_delete: <DeleteIcon color="error" />,
  user_create: <PersonIcon color="success" />,
  user_update: <EditIcon color="success" />,
  user_delete: <DeleteIcon color="error" />,
  profile_update: <PersonIcon color="info" />,
  tag_create: <TagIcon color="secondary" />,
  tag_update: <EditIcon color="secondary" />,
  tag_delete: <DeleteIcon color="error" />,
  role_create: <RoleIcon color="warning" />,
  role_update: <EditIcon color="warning" />,
  role_delete: <DeleteIcon color="error" />,
  comment_create: <CommentIcon color="info" />,
  comment_delete: <DeleteIcon color="error" />,
};

const ACTIVITY_TYPES = [
  { value: '', label: 'All Activities' },
  { value: 'post_create', label: 'Post Created' },
  { value: 'post_update', label: 'Post Updated' },
  { value: 'post_delete', label: 'Post Deleted' },
  { value: 'user_create', label: 'User Created' },
  { value: 'user_update', label: 'User Updated' },
  { value: 'user_delete', label: 'User Deleted' },
  { value: 'profile_update', label: 'Profile Updated' },
  { value: 'tag_create', label: 'Tag Created' },
  { value: 'tag_update', label: 'Tag Updated' },
  { value: 'tag_delete', label: 'Tag Deleted' },
  { value: 'role_create', label: 'Role Created' },
  { value: 'role_update', label: 'Role Updated' },
  { value: 'role_delete', label: 'Role Deleted' },
  { value: 'comment_create', label: 'Comment Created' },
  { value: 'comment_delete', label: 'Comment Deleted' },
];

const ActivityList = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, typeFilter]);

  useEffect(() => {
    fetchActivities();
  }, [page, rowsPerPage, debouncedSearchTerm, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }

      if (typeFilter) {
        params.type = typeFilter;
      }

      const response = await api.get('/admin/activities', { params });
      setActivities(response.data.activities || []);
      setTotalItems(response.data.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleActivityClick = activity => {
    const { type, data } = activity;
    switch (type) {
      case 'post_create':
      case 'post_update':
        if (data.id) navigate(`/admin/posts/edit/${data.id}`);
        break;
      case 'post_delete':
        navigate('/admin/posts');
        break;
      case 'user_create':
      case 'user_update':
        if (data.id) navigate(`/admin/users/edit/${data.id}`);
        break;
      case 'user_delete':
        navigate('/admin/users');
        break;
      case 'profile_update':
        navigate('/admin/account');
        break;
      case 'tag_create':
      case 'tag_update':
      case 'tag_delete':
        navigate('/admin/tags');
        break;
      case 'role_create':
      case 'role_update':
      case 'role_delete':
        navigate('/admin/roles');
        break;
      case 'comment_create':
      case 'comment_delete':
        if (data.postId) navigate(`/admin/posts/edit/${data.postId}`);
        break;
      default:
        break;
    }
  };

  const getActivityTypeChip = type => {
    const config = ACTIVITY_TYPES.find(t => t.value === type);
    const color = type.includes('delete') ? 'error' : 
      type.includes('create') ? 'success' : 'primary';
    
    return (
      <Chip
        label={config?.label || type}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatActivityDescription = activity => {
    const actor = activity.user?.fullName || activity.user?.username || 'System';
    
    switch (activity.type) {
      case 'post_create':
        return `${actor} created post "${activity.data.title}"`;
      case 'post_update':
        return `${actor} updated post "${activity.data.title}"`;
      case 'post_delete':
        return `${actor} deleted post "${activity.data.title}"`;
      case 'user_create':
        return `New user registered: ${activity.data.fullName || activity.data.username}`;
      case 'user_update':
        return `${actor} updated user ${activity.data.username}`;
      case 'user_delete':
        return `${actor} deleted user ${activity.data.username}`;
      case 'profile_update':
        return `${actor} updated their profile`;
      case 'tag_create':
        return `${actor} created tag "${activity.data.displayName || activity.data.name}"`;
      case 'tag_update':
        return `${actor} updated tag "${activity.data.displayName || activity.data.name}"`;
      case 'tag_delete':
        return `${actor} deleted tag "${activity.data.displayName || activity.data.name}"`;
      case 'role_create':
        return `${actor} created role "${activity.data.name}"`;
      case 'role_update':
        return `${actor} updated role "${activity.data.name}"`;
      case 'role_delete':
        return `${actor} deleted role "${activity.data.name}"`;
      case 'comment_create':
        return `${actor} commented on "${activity.data.postTitle}"`;
      case 'comment_delete':
        return `${actor} deleted a comment on "${activity.data.postTitle}"`;
      default:
        return 'Unknown activity';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Activities
        </Typography>
        {[...Array(10)].map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Activities
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor all system activities including posts, users, tags, roles, and comments
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search activities..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 300 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Activity Type</InputLabel>
              <Select
                value={typeFilter}
                label="Activity Type"
                onChange={e => setTypeFilter(e.target.value)}
              >
                {ACTIVITY_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Clear Filters">
              <IconButton 
                onClick={handleClearFilters} 
                disabled={!searchTerm && !typeFilter}
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Activity</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeleton rows
                [...Array(rowsPerPage)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={100} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={200} /></TableCell>
                    <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  </TableRow>
                ))
              ) : activities.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No activities found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm || typeFilter 
                          ? 'Try adjusting your search or filter criteria' 
                          : 'No activities have been recorded yet'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                // Activity rows
                activities.map(activity => (
                  <TableRow 
                    key={activity._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleActivityClick(activity)}
                  >
                    <TableCell>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {ACTIVITY_ICONS[activity.type] || <EditIcon />}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      {getActivityTypeChip(activity.type)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.user?.fullName || activity.user?.username || 'System'}
                        </Typography>
                        {activity.user?.username && activity.user?.fullName && (
                          <Typography variant="caption" color="text.secondary">
                            @{activity.user.username}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatActivityDescription(activity)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default ActivityList;