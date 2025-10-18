import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import UserList from './UserList';
import UserForm from './UserForm';

const UserManager = () => {
  const navigate = useNavigate();

  const handleEdit = user => {
    navigate(`edit/${user._id}`);
  };

  const handleCreate = () => {
    navigate('new');
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  return (
    <Box>
      <Routes>
        <Route
          path="/"
          element={(
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
          )}
        />
        <Route
          path="/new"
          element={
            <UserForm onBack={handleBack} />
          }
        />
        <Route
          path="/edit/:id"
          element={
            <UserForm onBack={handleBack} />
          }
        />
      </Routes>
    </Box>
  );
};

export default UserManager;