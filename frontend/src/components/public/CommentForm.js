import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CommentForm.css';

const CommentForm = ({ postId }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');

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
    if (!content.trim() || !name.trim() || !captchaText) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.post(`http://localhost:5002/api/public/posts/${postId}/comments`, {
        content: content.trim(),
        name: name.trim(),
        captchaText,
        captchaSessionId
      });

      if (response.status === 201) {
        setContent('');
        setName('');
        setCaptchaText('');
        setSuccess(true);
        loadCaptcha(); // Load new CAPTCHA after successful submission
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
      loadCaptcha(); // Refresh CAPTCHA on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-form">
      <h4>Add a Comment</h4>
      {success && (
        <div className="success-message">
          Comment added successfully!
        </div>
      )}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            minLength={2}
            maxLength={50}
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">Comment:</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your comment"
            required
            minLength={1}
            maxLength={1000}
            rows={4}
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
                onChange={(e) => setCaptchaText(e.target.value.toUpperCase())}
                placeholder="Enter CAPTCHA text"
                required
              />
            </>
          )}
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Comment'}
        </button>
      </form>
    </div>
  );
};

export default CommentForm;