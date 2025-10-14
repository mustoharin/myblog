import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import PostList from './PostList';
import PostForm from './PostForm';

const PostsManager = () => {
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState(null);

  const handleEdit = (post) => {
    setSelectedPost(post);
    navigate('edit');
  };

  const handleCreate = () => {
    setSelectedPost(null);
    navigate('new');
  };

  const handleBack = () => {
    setSelectedPost(null);
    navigate('.');
  };

  return (
    <Box>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Posts</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreate}
                >
                  New Post
                </Button>
              </Box>
              <PostList onEdit={handleEdit} />
            </>
          }
        />
        <Route
          path="/new"
          element={
            <PostForm onBack={handleBack} />
          }
        />
        <Route
          path="/edit"
          element={
            <PostForm post={selectedPost} onBack={handleBack} />
          }
        />
      </Routes>
    </Box>
  );
};

export default PostsManager;