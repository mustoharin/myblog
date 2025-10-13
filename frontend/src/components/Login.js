import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      const response = await axios.get('http://localhost:5002/api/auth/captcha');
      setCaptchaImage(response.data.imageDataUrl);
      setCaptchaSessionId(response.data.sessionId);
      setCaptchaText('');
    } catch (err) {
      setError('Failed to load CAPTCHA');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5002/api/auth/login', {
        username: 'superadmin',  // Use the actual username instead of email
        password,
        captchaText,
        captchaSessionId
      });

      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Redirect to admin panel
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="superadmin"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group captcha-group">
            {captchaImage && (
              <>
                <img 
                  src={captchaImage} 
                  alt="CAPTCHA" 
                  onClick={loadCaptcha}
                  style={{ cursor: 'pointer' }}
                  title="Click to refresh CAPTCHA"
                />
                <input
                  type="text"
                  value={captchaText}
                  onChange={(e) => setCaptchaText(e.target.value)}
                  placeholder="Enter CAPTCHA text"
                  required
                />
              </>
            )}
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default Login;