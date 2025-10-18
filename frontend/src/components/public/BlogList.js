import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Pagination,
  TextField,
  InputAdornment,
  IconButton,
  Skeleton,
  Button,
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import api from '../../services/api';

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pageParam = parseInt(params.get('page')) || 1;
    const searchParam = params.get('search') || '';
    
    setSearch(searchParam);
    fetchPosts(pageParam, searchParam);
  }, [location.search]);

  const fetchPosts = async (page, searchTerm) => {
    setLoading(true);
    try {
      const response = await api.get('/public/posts', {
        params: {
          page,
          search: searchTerm.startsWith('#') ? '' : searchTerm,
          tags: searchTerm.startsWith('#') ? searchTerm.substring(1) : '',
          limit: 9,
        },
      });
      console.log('API Response:', response.data);
      const posts = response.data.posts || [];
      const total = response.data.total || 0;
      setPosts(posts);
      setTotalPages(Math.ceil(total / 9));
    } catch (err) {
      console.error('Error fetching posts:', err);
      setPosts([]);
      setTotalPages(1);
      if (err.response?.status === 404) {
        setError('No posts found');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!navigator.onLine) {
        setError('Please check your internet connection');
      } else {
        setError('Failed to load posts. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, value) => {
    updateUrl(value, search);
    window.scrollTo(0, 0);
  };

  const handleSearch = event => {
    const value = event.target.value;
    setSearch(value);
    updateUrl(1, value);
  };

  const clearSearch = () => {
    setSearch('');
    updateUrl(1, '');
  };

  const updateUrl = (page, searchTerm) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (page > 1) params.set('page', page.toString());
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    navigate(newUrl, { replace: true });
  };

  const LoadingSkeleton = () => (
    <Grid item xs={12} sm={6} md={4}>
      <Card>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="60%" />
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          value={search}
          onChange={handleSearch}
          placeholder="Search posts..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton onClick={clearSearch} size="small">
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error ? (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={4}>
            {loading ? (
              Array.from(new Array(6)).map((_, index) => (
                <LoadingSkeleton key={index} />
              ))
            ) : posts.length === 0 ? (
              <Grid item xs={12}>
                <Typography align="center">
                  {search ? 'No posts found matching your search.' : 'No posts available.'}
                </Typography>
              </Grid>
            ) : (
              posts.map(post => (
                <Grid item key={post._id} xs={12} sm={6} md={4}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/post/${post._id}`)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h5" component="h2">
                        {post.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {post.excerpt || post.content}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {Array.isArray(post.tags) && post.tags.map(tag => {
                          const tagName = typeof tag === 'string' ? tag : tag.name;
                          const tagLabel = typeof tag === 'string' ? tag : tag.displayName || tag.name;
                          const tagColor = typeof tag === 'string' ? '#1976d2' : tag.color || '#1976d2';
                          
                          return (
                            <Chip
                              key={tagName}
                              label={tagLabel}
                              size="small"
                              sx={{ 
                                mr: 1, 
                                mb: 1,
                                backgroundColor: `${tagColor}20`,
                                color: tagColor,
                                borderColor: tagColor,
                                border: `1px solid ${tagColor}40`,
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/?search=${encodeURIComponent(`#${tagName}`)}`);
                              }}
                            />
                          );
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>

          {!loading && totalPages > 1 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={parseInt(new URLSearchParams(location.search).get('page')) || 1}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default BlogList;