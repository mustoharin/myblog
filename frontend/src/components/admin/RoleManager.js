import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import RoleList from './RoleList';
import RoleForm from './RoleForm';

const RoleManager = () => {
  const navigate = useNavigate();

  const handleEdit = (role) => {
    navigate(`edit/${role._id}`);
  };

  const handleCreate = () => {
    navigate('new');
  };

  const handleBack = () => {
    navigate('/admin/roles');
  };

  return (
    <Box>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Roles & Permissions</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreate}
                >
                  New Role
                </Button>
              </Box>
              <RoleList onEdit={handleEdit} />
            </>
          }
        />
        <Route
          path="/new"
          element={
            <RoleForm onBack={handleBack} />
          }
        />
        <Route
          path="/edit/:id"
          element={
            <RoleForm onBack={handleBack} />
          }
        />
      </Routes>
    </Box>
  );
};

export default RoleManager;