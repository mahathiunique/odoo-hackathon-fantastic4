import { createContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('assetflow_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('assetflow_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('assetflow_token')));

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('assetflow_token');
    if (!storedToken) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await authService.getCurrentUser();
      const currentUser = response.data?.user || response.data;
      setUser(currentUser);
      setIsAuthenticated(true);
      localStorage.setItem('assetflow_user', JSON.stringify(currentUser));
      return currentUser;
    } catch (error) {
      localStorage.removeItem('assetflow_token');
      localStorage.removeItem('assetflow_user');
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    const authData = response.data;
    const nextUser = authData.user;
    const nextToken = authData.token;

    localStorage.setItem('assetflow_token', nextToken);
    localStorage.setItem('assetflow_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setIsAuthenticated(true);
    return nextUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
