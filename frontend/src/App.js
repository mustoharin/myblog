import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Admin Components
import Dashboard from './components/admin/Dashboard';
import PostsManager from './components/admin/PostsManager';
import UserManager from './components/admin/UserManager';
import RoleManager from './components/admin/RoleManager';
import TagManager from './components/admin/TagManager';
import ActivityList from './components/admin/ActivityList';
import Overview from './components/admin/Overview';

// Public Components
import BlogList from './components/public/BlogList';
import BlogPost from './components/public/BlogPost';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Context
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<BlogList />} />
            <Route path="/post/:id" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes - Use nested routing */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="posts/*" element={<PostsManager />} />
              <Route path="users/*" element={<UserManager />} />
              <Route path="roles/*" element={<RoleManager />} />
              <Route path="tags/*" element={<TagManager />} />
              <Route path="activities" element={<ActivityList />} />
            </Route>
          </Routes>

          <ToastContainer position="bottom-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;