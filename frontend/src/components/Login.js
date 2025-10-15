import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  Link,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({
    sessionId: '',
    imageDataUrl: '',
    text: ''
  });
  const navigate = useNavigate();
  const { login } = useAuth();

  const fetchCaptcha = async () => {
    try {
      const response = await api.get('/auth/captcha');
      setCaptcha(prev => ({
        ...prev,
        sessionId: response.data.sessionId,
        imageDataUrl: response.data.imageDataUrl,
        text: ''
      }));
    } catch (error) {
      console.error('Failed to fetch CAPTCHA:', error);
      setError('Failed to load CAPTCHA. Please try again.');
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loginData = {
        username,
        password
      };

      // In test environment, use bypass token
      if (process.env.REACT_APP_TEST_MODE === 'true') {
        loginData.testBypassToken = process.env.TEST_BYPASS_CAPTCHA_TOKEN;
      } else {
        // In production, require CAPTCHA
        if (!captcha.text) {
          setError('Please enter the CAPTCHA text');
          setLoading(false);
          return;
        }
        loginData.captchaSessionId = captcha.sessionId;
        loginData.captchaText = captcha.text;
      }

      const response = await api.post('/auth/login', loginData);
      await login(response.data.token, response.data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Paper 
          elevation={3}
          sx={{
            marginTop: 3,
            padding: 3,
            width: '100%',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Box sx={{ mt: 2, mb: 2 }}>
              {captcha.imageDataUrl ? (
                <>
                  <img 
                    src={captcha.imageDataUrl} 
                    alt="CAPTCHA" 
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }} 
                  />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      id="captcha-input"
                      data-testid="captcha-input"
                      name="captcha"
                      label="Enter CAPTCHA"
                      value={captcha.text}
                      onChange={(e) => setCaptcha(prev => ({ ...prev, text: e.target.value }))}
                      required
                      size="small"
                      sx={{ flexGrow: 1 }}
                      disabled={loading}
                      inputProps={{
                        'data-testid': 'captcha-input',
                        'aria-label': 'Enter CAPTCHA code'
                      }}
                    />
                    <Button
                      id="refresh-captcha"
                      onClick={fetchCaptcha}
                      disabled={loading}
                      size="small"
                      aria-label="Refresh CAPTCHA"
                      data-testid="refresh-captcha-button"
                    >
                      New CAPTCHA
                    </Button>
                  </Box>
                </>
              ) : (
                <Alert severity="warning">
                  Loading CAPTCHA...
                </Alert>
              )}
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/forgot-password">
                Forgot Password?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
