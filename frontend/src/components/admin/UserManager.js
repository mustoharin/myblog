import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import UserList from './UserList';
import UserForm from './UserForm';

const UserManager = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);

  const handleEdit = (user) => {
    setSelectedUser(user);
    navigate('edit');
  };

  const handleCreate = () => {
    setSelectedUser(null);
    navigate('new');
  };

  const handleBack = () => {
    setSelectedUser(null);
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
                <Typography variant="h4">Users</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreate}
                >
                  New User
                </Button>
              </Box>
              <UserList onEdit={handleEdit} />
            </>
          }
        />
        <Route
          path="/new"
          element={
            <UserForm onBack={handleBack} />
          }
        />
        <Route
          path="/edit"
          element={
            <UserForm user={selectedUser} onBack={handleBack} />
          }
        />
      </Routes>
    </Box>
  );
};

export default UserManager;