import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('shap_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.data.user);
          setProfile(res.data.data.profile);
        }
      } catch (err) {
        console.error('Failed to load authenticated user profile', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: newUser, profile: newProfile } = res.data.data;
      localStorage.setItem('shap_token', newToken);
      localStorage.setItem('shap_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setProfile(newProfile);
      return newUser;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      const { token: newToken, user: newUser, profile: newProfile } = res.data.data;
      localStorage.setItem('shap_token', newToken);
      localStorage.setItem('shap_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setProfile(newProfile);
      return newUser;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('shap_token');
    localStorage.removeItem('shap_user');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        setProfile(res.data.data.profile);
      }
    } catch (err) {
      console.error('Error refreshing profile', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

