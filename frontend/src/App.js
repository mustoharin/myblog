import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PrivilegeManager from './components/admin/PrivilegeManager';
import CommentManagement from './components/admin/CommentManagement';
import Overview from './components/admin/Overview';
// Public Components
import BlogList from './components/public/BlogList';
import BlogPost from './components/public/BlogPost';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
// Common Components
import AccountSettings from './components/common/AccountSettings';
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
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            >
              <Route index element={<Overview />} />
              <Route path="posts/*" element={<PostsManager />} />
              <Route path="comments" element={<CommentManagement />} />
              <Route path="users/*" element={<UserManager />} />
              <Route path="roles/*" element={<RoleManager />} />
              <Route path="privileges" element={<PrivilegeManager />} />
              <Route path="tags/*" element={<TagManager />} />
              <Route path="activities" element={<ActivityList />} />
              <Route path="account" element={<AccountSettings />} />
            </Route>

            {/* Account Settings - Standalone for non-admin users */}
            <Route
              path="/account"
              element={(
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              )}
            />

            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<BlogList />} />
          </Routes>

          <ToastContainer position="bottom-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;