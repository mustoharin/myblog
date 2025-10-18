import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { setAuthToken, getUserData, setUserData, clearAuthData } from '../utils/secureAuth';
import { devError } from '../utils/secureLogging';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUserData();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (token, userData) => {
    setAuthToken(token);
    setUserData(userData);
    
    setUser(userData);
    return userData;
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      devError('Logout error:', error);
    } finally {
      clearAuthData();
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
