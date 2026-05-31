import React, { createContext, useState, useEffect, useContext } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, registerParent, registerDoctor } from '../api/auth';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    if (data.tokens) {
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.access}`;
    }
    setUser(data.user);
    return data;
  };

  const register = async (userData, role) => {
    let data;
    if (role === 'doctor') {
      data = await registerDoctor(userData);
    } else {
      data = await registerParent(userData);
    }
    if (data.tokens) {
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.access}`;
    }
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await apiLogout(refresh);
      } catch (e) {
        console.error('Logout error', e);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
