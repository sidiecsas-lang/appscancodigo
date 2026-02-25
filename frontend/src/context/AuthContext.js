import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL, getToken, setToken, removeToken, getUser, setUser, removeUser } from '../lib/utils';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = getToken();
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserState(response.data);
          setUser(response.data);
        } catch {
          removeToken();
          removeUser();
          setUserState(null);
        }
      }
      setLoading(false);
    };
    validateToken();
  }, []);

  const login = async (userCode, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      user_code: userCode,
      password: password
    });
    setToken(response.data.access_token);
    setUser(response.data.user);
    setUserState(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
