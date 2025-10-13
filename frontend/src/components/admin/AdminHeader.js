import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const AdminHeader = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        <div className="admin-header-left">
          <Link to="/admin" className="admin-logo">
            MyBlog Admin
          </Link>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-menu">
            <span className="admin-username">
              {user?.name || 'Admin'}
            </span>
            <div className="admin-dropdown">
              <Link to="/admin/profile">Profile</Link>
              <Link to="/">View Site</Link>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;