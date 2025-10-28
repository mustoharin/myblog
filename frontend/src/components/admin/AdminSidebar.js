import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Article as ArticleIcon,
  People as PeopleIcon,
  VpnKey as RolesIcon,
  LocalOffer as TagIcon,
  Timeline as ActivitiesIcon,
  Security as PrivilegesIcon,
  Settings as SettingsIcon,
  Comment as CommentIcon,
  PermMedia as MediaIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Posts', icon: <ArticleIcon />, path: '/admin/posts' },
  { text: 'Comments', icon: <CommentIcon />, path: '/admin/comments' },
  { text: 'Media', icon: <MediaIcon />, path: '/admin/media' },
  { text: 'Tags', icon: <TagIcon />, path: '/admin/tags' },
  { text: 'Activities', icon: <ActivitiesIcon />, path: '/admin/activities' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Roles', icon: <RolesIcon />, path: '/admin/roles' },
  { text: 'Privileges', icon: <PrivilegesIcon />, path: '/admin/privileges' },
];

const accountMenuItem = { text: 'Account Settings', icon: <SettingsIcon />, path: '/admin/account' };

const AdminSidebar = ({ mobileOpen = false, handleDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const drawer = (
    <>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map(item => (
          <ListItem
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{ cursor: 'pointer' }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem
          key={accountMenuItem.text}
          onClick={() => navigate(accountMenuItem.path)}
          selected={location.pathname === accountMenuItem.path}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>{accountMenuItem.icon}</ListItemIcon>
          <ListItemText primary={accountMenuItem.text} />
        </ListItem>
      </List>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default AdminSidebar;