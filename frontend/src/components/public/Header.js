import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const { user, isAuthenticated } = useContext(AuthContext);

  return (
    <header className="public-header">
      <nav className="nav-container">
        <div className="logo">
          <Link to="/">MyBlog</Link>
        </div>
        
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/blog">Blog</Link>
          {isAuthenticated && user?.role === 'admin' && (
            <Link to="/admin">Admin Dashboard</Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;