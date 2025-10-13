import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminSidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="admin-sidebar">
      <nav className="admin-nav">
        <ul>
          <li className={isActive('/admin') ? 'active' : ''}>
            <Link to="/admin">
              <span className="icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li className={isActive('/admin/posts') ? 'active' : ''}>
            <Link to="/admin/posts">
              <span className="icon">📝</span>
              Posts
            </Link>
          </li>
          <li className={isActive('/admin/users') ? 'active' : ''}>
            <Link to="/admin/users">
              <span className="icon">👥</span>
              Users
            </Link>
          </li>
          <li className={isActive('/admin/comments') ? 'active' : ''}>
            <Link to="/admin/comments">
              <span className="icon">💬</span>
              Comments
            </Link>
          </li>
          <li className={isActive('/admin/settings') ? 'active' : ''}>
            <Link to="/admin/settings">
              <span className="icon">⚙️</span>
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;